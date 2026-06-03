import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

export type Employee = {
  id: number;
  employee_id: string;
  full_name: string;
  department: string;
  site_location: string;
  face_front_path: string | null;
  face_left_path: string | null;
  face_right_path: string | null;
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function saveEmployee(input: EmployeeInput): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO employees (
      employee_id, full_name, department, site_location,
      face_front_path, face_left_path, face_right_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.employeeId.trim(),
    input.fullName.trim(),
    input.department.trim(),
    input.siteLocation.trim(),
    input.faceFrontPath ?? null,
    input.faceLeftPath ?? null,
    input.faceRightPath ?? null
  );
  return result.lastInsertRowId;
}

export async function getEmployeeCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM employees'
  );
  return row?.count ?? 0;
}

export async function getAllEmployees(): Promise<Employee[]> {
  const database = await getDb();
  return database.getAllAsync<Employee>(
    'SELECT * FROM employees ORDER BY created_at DESC'
  );
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

  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}
