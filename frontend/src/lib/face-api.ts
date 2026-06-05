import * as FileSystem from 'expo-file-system/legacy';

import { checkFaceApiReachable, getFaceApiBaseUrl } from '@/lib/face-settings';

export type EmbedResponse = {
  embedding: number[];
  dimensions: number;
};

export type VerifyResponse = {
  score: number;
  match: boolean;
  threshold: number;
};

export type SpoofResponse = {
  available: boolean;
  real?: boolean;
  message?: string;
};

export type DetectResponse = {
  detected: boolean;
  count: number;
  center_x?: number | null;
};

export class FaceApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'FaceApiError';
  }
}

type ApiBody = { detail?: string };

async function resolvePhotoUri(storedPath: string): Promise<string> {
  if (!storedPath || storedPath.startsWith('mock://')) {
    throw new FaceApiError('Invalid photo. Re-capture on the iPhone app.');
  }

  const candidates = new Set<string>([storedPath]);
  if (storedPath.startsWith('file://')) {
    candidates.add(storedPath.replace('file://', ''));
  } else {
    candidates.add(`file://${storedPath}`);
  }

  for (const candidate of candidates) {
    try {
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists) {
        return candidate.startsWith('file://') ? candidate : `file://${candidate}`;
      }
    } catch {
      /* try next candidate */
    }
  }

  throw new FaceApiError('Photo file missing on device. Re-enroll and capture again.');
}

async function postImageFile<T>(
  path: string,
  uri: string,
  extraFields?: Record<string, string>
): Promise<T> {
  const baseUrl = await getFaceApiBaseUrl();
  const fileUri = await resolvePhotoUri(uri);

  const result = await FileSystem.uploadAsync(`${baseUrl}${path}`, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'image',
    parameters: extraFields,
  });

  let body: ApiBody = {};
  try {
    body = JSON.parse(result.body) as ApiBody;
  } catch {
    body = {};
  }

  if (result.status < 200 || result.status >= 300) {
    throw new FaceApiError(body.detail ?? `Request failed (${result.status})`, result.status);
  }

  return body as T;
}

export async function checkFaceApiHealth(): Promise<boolean> {
  return checkFaceApiReachable();
}

/** Quick face presence check for live enroll preview. */
export async function detectFaceFromUri(uri: string): Promise<DetectResponse> {
  return postImageFile<DetectResponse>('/api/detect', uri);
}

/** Generate embedding from photo (NHAI_HACK enroll.py). */
export async function embedFaceFromUri(uri: string): Promise<EmbedResponse> {
  return postImageFile<EmbedResponse>('/api/embed', uri);
}

/** Verify live photo against enrolled embedding (NHAI_HACK login.py). */
export async function verifyFaceFromUri(
  uri: string,
  referenceEmbedding: number[]
): Promise<VerifyResponse> {
  return postImageFile<VerifyResponse>('/api/verify', uri, {
    reference_embedding: JSON.stringify(referenceEmbedding),
  });
}

export async function checkSpoofFromUri(uri: string): Promise<SpoofResponse> {
  return postImageFile<SpoofResponse>('/api/spoof', uri);
}
