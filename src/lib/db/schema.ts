import type { DatabaseSync } from 'node:sqlite';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS office_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  target_latitude REAL NOT NULL,
  target_longitude REAL NOT NULL,
  max_radius_meters REAL NOT NULL,
  work_start_time TEXT NOT NULL,
  work_end_time TEXT NOT NULL,
  email_atasan TEXT NOT NULL,
  wa_group_interns_jid TEXT,
  wa_group_mentors_jid TEXT
);

CREATE TABLE IF NOT EXISTS interns (
  id TEXT PRIMARY KEY,
  nama_lengkap TEXT NOT NULL,
  divisi TEXT NOT NULL,
  nama_mentor TEXT NOT NULL,
  email_mentor TEXT NOT NULL,
  universitas TEXT NOT NULL,
  jurusan TEXT NOT NULL,
  periode_magang_selesai TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED')),
  pin_hash TEXT
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  intern_id TEXT NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in_time TEXT,
  check_out_time TEXT,
  check_in_lat REAL,
  check_in_lng REAL,
  check_out_lat REAL,
  check_out_lng REAL,
  distance_in_meters REAL,
  status TEXT NOT NULL CHECK (status IN ('ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'ABSENT')),
  remarks TEXT,
  location_id TEXT,
  photo_url TEXT,
  UNIQUE(intern_id, date)
);

CREATE TABLE IF NOT EXISTS office_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  max_radius_meters REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attendance_requests (
  id TEXT PRIMARY KEY,
  intern_id TEXT NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('WFH', 'SAKIT', 'IZIN', 'DISPENSASI', 'OFF_SITE')),
  reason TEXT NOT NULL,
  attachment_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(intern_id, date)
);
`;

/**
 * Executes DDL schema setup and migrations on the given SQLite database.
 */
export function initSchema(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);

  // Backward compatible migrations for existing tables
  try {
    db.exec('ALTER TABLE interns ADD COLUMN pin_hash TEXT;');
  } catch {
    // Column already exists
  }

  try {
    db.exec('ALTER TABLE attendance_logs ADD COLUMN location_id TEXT;');
  } catch {
    // Column already exists
  }

  try {
    db.exec('ALTER TABLE attendance_logs ADD COLUMN photo_url TEXT;');
  } catch {
    // Column already exists
  }
}
