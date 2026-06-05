import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

import { seedDemoWorkerEnrollments } from '@/lib/demo-worker-seed';

export type Employee = {
  id: number;
  employee_id: string;
  full_name: string;
  department: string;
  site_location: string;
  face_front_path: string | null;
  face_left_path: string | null;
  face_right_path: string | null;
  face_embedding: string | null;
  created_at: string;
};

export type EmployeeInput = {
  employeeId: string;
  fullName: string;
  department: string;
  siteLocation: string;
  faceFrontPath?: string | null;
  faceLeftPath?: string | null;
  faceRightPath?: string | null;
  faceEmbedding?: string | null;
};

export type AttendanceRecord = {
  id: number;
  employee_id: string;
  full_name: string;
  department: string;
  match_score: number;
  liveness_passed: number;
  verified: number;
  checked_in_at: string;
  synced: number;
};

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('nhai_secureid.db');
  }
  return db;
}

export async function initDatabase() {
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '',
      site_location TEXT NOT NULL DEFAULT '',
      face_front_path TEXT,
      face_left_path TEXT,
      face_right_path TEXT,
      face_embedding TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      match_score REAL NOT NULL DEFAULT 0,
      liveness_passed INTEGER NOT NULL DEFAULT 1,
      verified INTEGER NOT NULL DEFAULT 1,
      checked_in_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  try {
    await database.execAsync(`ALTER TABLE employees ADD COLUMN face_embedding TEXT;`);
  } catch {
    /* column already exists */
  }

  try {
    await seedDemoWorkerEnrollments();
  } catch (e) {
    console.warn('Demo worker seed skipped:', e);
  }
}

export async function getPendingEnrollmentEmployees(): Promise<Employee[]> {
  const database = await getDb();
  return database.getAllAsync<Employee>(
    `SELECT * FROM employees
     WHERE face_front_path IS NULL OR face_front_path = ''
     ORDER BY full_name ASC`
  );
}

export async function saveEmployee(input: EmployeeInput): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO employees (
      employee_id, full_name, department, site_location,
      face_front_path, face_left_path, face_right_path, face_embedding
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.employeeId.trim(),
    input.fullName.trim(),
    input.department.trim(),
    input.siteLocation.trim(),
    input.faceFrontPath ?? null,
    input.faceLeftPath ?? null,
    input.faceRightPath ?? null,
    input.faceEmbedding ?? null
  );
  return result.lastInsertRowId;
}

/** Insert or update when re-enrolling the same employee ID. */
export async function upsertEmployee(input: EmployeeInput): Promise<number> {
  const existing = await getEmployeeByEmployeeId(input.employeeId);
  if (!existing) {
    return saveEmployee(input);
  }

  const database = await getDb();
  await database.runAsync(
    `UPDATE employees SET
      full_name = ?,
      department = ?,
      site_location = ?,
      face_front_path = ?,
      face_left_path = ?,
      face_right_path = ?,
      face_embedding = COALESCE(?, face_embedding)
    WHERE employee_id = ?`,
    input.fullName.trim(),
    input.department.trim(),
    input.siteLocation.trim(),
    input.faceFrontPath ?? null,
    input.faceLeftPath ?? null,
    input.faceRightPath ?? null,
    input.faceEmbedding ?? null,
    input.employeeId.trim()
  );
  return existing.id;
}

export async function getEmployeeCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM employees'
  );
  return row?.count ?? 0;
}

export async function getEnrolledEmployeeCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM employees
     WHERE face_front_path IS NOT NULL
       AND face_front_path != ''
       AND face_front_path NOT LIKE 'mock://%'`
  );
  return row?.count ?? 0;
}

export async function getEnrolledEmployees(): Promise<Employee[]> {
  const database = await getDb();
  return database.getAllAsync<Employee>(
    `SELECT * FROM employees
     WHERE face_front_path IS NOT NULL
       AND face_front_path != ''
       AND face_front_path NOT LIKE 'mock://%'
     ORDER BY full_name ASC`
  );
}

export async function getAllEmployees(): Promise<Employee[]> {
  const database = await getDb();
  return database.getAllAsync<Employee>(
    'SELECT * FROM employees ORDER BY created_at DESC'
  );
}

export async function getEmployeeByEmployeeId(
  employeeId: string
): Promise<Employee | null> {
  const database = await getDb();
  return database.getFirstAsync<Employee>(
    'SELECT * FROM employees WHERE employee_id = ?',
    employeeId.trim()
  );
}

export async function updateEmployeeEmbedding(
  employeeId: string,
  faceEmbedding: string
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'UPDATE employees SET face_embedding = ? WHERE employee_id = ?',
    faceEmbedding,
    employeeId.trim()
  );
}

export async function markAttendanceVerified(input: {
  employeeId: string;
  fullName: string;
  department?: string;
  matchScore: number;
  livenessPassed: boolean;
  verified: boolean;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO attendance (
      employee_id, full_name, department, match_score, liveness_passed, verified, synced
    ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
    input.employeeId.trim(),
    input.fullName.trim(),
    (input.department ?? '').trim(),
    input.matchScore,
    input.livenessPassed ? 1 : 0,
    input.verified ? 1 : 0
  );
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  const database = await getDb();
  return database.getAllAsync<AttendanceRecord>(
    'SELECT * FROM attendance ORDER BY checked_in_at DESC'
  );
}

export async function getTodayAttendanceCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM attendance
     WHERE verified = 1 AND date(checked_in_at) = date('now', 'localtime')`
  );
  return row?.count ?? 0;
}

/** Unique workers with a verified check-in today. */
export async function getTodayPresentCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT employee_id) as count FROM attendance
     WHERE verified = 1 AND date(checked_in_at) = date('now', 'localtime')`
  );
  return row?.count ?? 0;
}

export async function getPendingSyncCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM attendance WHERE synced = 0'
  );
  return row?.count ?? 0;
}

export async function getPendingAttendanceRecords(): Promise<AttendanceRecord[]> {
  const database = await getDb();
  return database.getAllAsync<AttendanceRecord>(
    'SELECT * FROM attendance WHERE synced = 0 ORDER BY checked_in_at ASC'
  );
}

export async function markAttendanceRecordsSynced(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const database = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  const result = await database.runAsync(
    `UPDATE attendance SET synced = 1 WHERE id IN (${placeholders})`,
    ...ids
  );
  return result.changes;
}

export async function getFacesDirectory(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}faces/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export async function persistFacePhoto(
  tempUri: string,
  employeeId: string,
  angle: 'front' | 'left' | 'right'
): Promise<string> {
  const dir = await getFacesDirectory();
  const safeId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dest = `${dir}${safeId}_${angle}_${Date.now()}.jpg`;

  if (tempUri.startsWith('mock://')) {
    return dest;
  }

  const from = tempUri.startsWith('file://') ? tempUri : `file://${tempUri}`;
  await FileSystem.copyAsync({ from, to: dest });
  return dest;
}
