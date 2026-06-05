import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

const SETTINGS_FILE = `${FileSystem.documentDirectory}face-api-settings.json`;

const DEFAULT_URL =
  (Constants.expoConfig?.extra as { faceApiUrl?: string } | undefined)?.faceApiUrl ??
  'http://192.168.1.4:8000';

type Settings = { baseUrl: string };

let cachedUrl: string | null = null;

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export function getDefaultFaceApiUrl(): string {
  return normalizeUrl(DEFAULT_URL);
}

export function resetFaceApiUrlCache(): void {
  cachedUrl = null;
}

async function readSavedUrl(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    const parsed = JSON.parse(raw) as Settings;
    return parsed.baseUrl ? normalizeUrl(parsed.baseUrl) : null;
  } catch {
    return null;
  }
}

async function pingHealth(baseUrl: string, timeoutMs = 6000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Scan common LAN hosts on port 8000 (Mac IP may change on Wi‑Fi). */
function buildLanScanCandidates(): string[] {
  const urls: string[] = [];
  const prefixes = ['192.168.1', '192.168.0', '10.0.0'];
  for (const prefix of prefixes) {
    for (let host = 1; host <= 12; host++) {
      urls.push(`http://${prefix}.${host}:8000`);
    }
  }
  return urls;
}

function uniqueUrls(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (!raw) continue;
    const url = normalizeUrl(raw);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Try URLs in parallel; return first that responds. */
async function findReachableUrl(candidates: string[]): Promise<string | null> {
  if (candidates.length === 0) return null;

  return new Promise((resolve) => {
    let pending = candidates.length;
    let found: string | null = null;

    const done = (url: string | null) => {
      if (found) return;
      if (url) {
        found = url;
        resolve(url);
        return;
      }
      pending -= 1;
      if (pending === 0) resolve(null);
    };

    for (const url of candidates) {
      pingHealth(url, 5000).then((ok) => done(ok ? url : null));
    }
  });
}

/** Pick a reachable Face API URL; auto-saves when found. */
export async function resolveFaceApiBaseUrl(): Promise<string> {
  const defaultUrl = getDefaultFaceApiUrl();
  const savedUrl = await readSavedUrl();

  const priority = uniqueUrls([
    savedUrl,
    defaultUrl,
    'http://192.168.1.4:8000',
    'http://192.168.1.5:8000',
  ]);

  let found = await findReachableUrl(priority);
  if (!found) {
    const scan = buildLanScanCandidates().filter((u) => !priority.includes(u));
    found = await findReachableUrl(scan.slice(0, 24));
  }

  if (found) {
    if (found !== savedUrl) {
      await setFaceApiBaseUrl(found);
    }
    cachedUrl = found;
    return found;
  }

  cachedUrl = savedUrl ?? defaultUrl;
  return cachedUrl;
}

export async function getFaceApiBaseUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;
  return resolveFaceApiBaseUrl();
}

export async function checkFaceApiReachable(): Promise<boolean> {
  resetFaceApiUrlCache();
  const url = await resolveFaceApiBaseUrl();
  return pingHealth(url, 6000);
}

export async function connectFaceApi(): Promise<{ ok: boolean; url: string }> {
  resetFaceApiUrlCache();
  const url = await resolveFaceApiBaseUrl();
  const ok = await pingHealth(url, 6000);
  return { ok, url };
}

export async function setFaceApiBaseUrl(baseUrl: string): Promise<void> {
  const normalized = normalizeUrl(baseUrl);
  await FileSystem.writeAsStringAsync(
    SETTINGS_FILE,
    JSON.stringify({ baseUrl: normalized })
  );
  cachedUrl = normalized;
}
