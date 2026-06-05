import * as FileSystem from 'expo-file-system/legacy';

import {
  getPendingAttendanceRecords,
  markAttendanceRecordsSynced,
  type AttendanceRecord,
} from '@/lib/database';

const LAST_SYNC_FILE = `${FileSystem.documentDirectory}nhai-last-sync.json`;

export type SyncResult = {
  ok: boolean;
  syncedCount: number;
  message: string;
  at: string;
};

export async function getLastSyncTime(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(LAST_SYNC_FILE);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(LAST_SYNC_FILE);
    const parsed = JSON.parse(raw) as { at?: string };
    return parsed.at ?? null;
  } catch {
    return null;
  }
}

async function saveLastSyncTime(iso: string): Promise<void> {
  await FileSystem.writeAsStringAsync(LAST_SYNC_FILE, JSON.stringify({ at: iso }));
}

/** Upload pending attendance logs (demo: marks synced locally). */
export async function syncPendingAttendance(): Promise<SyncResult> {
  const pending = await getPendingAttendanceRecords();
  if (pending.length === 0) {
    const at = new Date().toISOString();
    await saveLastSyncTime(at);
    return {
      ok: true,
      syncedCount: 0,
      message: 'Already up to date — nothing to sync.',
      at,
    };
  }

  // Simulate cloud upload delay; replace with real AWS/Datalake API when available.
  await new Promise((r) => setTimeout(r, 800));

  const ids = pending.map((r) => r.id);
  const changed = await markAttendanceRecordsSynced(ids);
  const at = new Date().toISOString();
  await saveLastSyncTime(at);

  return {
    ok: true,
    syncedCount: changed,
    message: `Synced ${changed} attendance record(s) to cloud.`,
    at,
  };
}

export function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function summarizePending(records: AttendanceRecord[]): string {
  const verified = records.filter((r) => r.verified === 1).length;
  return `${records.length} pending · ${verified} verified`;
}
