-- ==============================================================================
-- Attendance Management System - Initial PostgreSQL Schema for Supabase
-- Target Environment: Supabase Postgres (Vercel Serverless Production)
-- Date: 2026-10-16
-- ==============================================================================

-- 1. Office Config (Global Master Data)
CREATE TABLE IF NOT EXISTS office_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  target_latitude DOUBLE PRECISION NOT NULL,
  target_longitude DOUBLE PRECISION NOT NULL,
  max_radius_meters DOUBLE PRECISION NOT NULL,
  work_start_time VARCHAR(5) NOT NULL,
  work_end_time VARCHAR(5) NOT NULL,
  email_atasan VARCHAR(255) NOT NULL,
  wa_group_interns_jid VARCHAR(255),
  wa_group_mentors_jid VARCHAR(255)
);

-- 2. Office Locations (Multi-hub geofencing)
CREATE TABLE IF NOT EXISTS office_locations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  max_radius_meters DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Interns Profile Table
CREATE TABLE IF NOT EXISTS interns (
  id VARCHAR(64) PRIMARY KEY,
  nama_lengkap VARCHAR(255) NOT NULL,
  divisi VARCHAR(255) NOT NULL,
  nama_mentor VARCHAR(255) NOT NULL,
  email_mentor VARCHAR(255) NOT NULL,
  universitas VARCHAR(255) NOT NULL,
  jurusan VARCHAR(255) NOT NULL,
  periode_magang_selesai VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED')),
  pin_hash VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  assigned_location_id VARCHAR(64) REFERENCES office_locations(id) ON DELETE SET NULL,
  photo_url TEXT
);

-- 4. Attendance Logs (Check-In & Check-Out records)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id VARCHAR(128) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time VARCHAR(8),
  check_out_time VARCHAR(8),
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  distance_in_meters DOUBLE PRECISION,
  status VARCHAR(32) NOT NULL CHECK (status IN ('ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'ABSENT')),
  remarks TEXT,
  location_id VARCHAR(64) REFERENCES office_locations(id) ON DELETE SET NULL,
  photo_url TEXT,
  check_out_photo_url TEXT,
  UNIQUE(intern_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_intern_date ON attendance_logs(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);

-- 5. Attendance Requests (Leave / Permission / SAKIT / WFH)
CREATE TABLE IF NOT EXISTS attendance_requests (
  id VARCHAR(128) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('WFH', 'SAKIT', 'IZIN', 'DISPENSASI', 'OFF_SITE')),
  reason TEXT NOT NULL,
  attachment_path TEXT,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(intern_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_requests_status ON attendance_requests(status);

-- 6. Relocation Requests (Office hub transfers)
CREATE TABLE IF NOT EXISTS relocation_requests (
  id VARCHAR(128) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  current_location_id VARCHAR(64) NOT NULL REFERENCES office_locations(id),
  target_location_id VARCHAR(64) NOT NULL REFERENCES office_locations(id),
  reason TEXT NOT NULL,
  notes TEXT,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Administrative Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'SUPERVISOR')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. User / Intern Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('INTERN', 'ADMIN', 'SUPERVISOR')),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ==============================================================================
-- Default Seeds
-- ==============================================================================

-- Default KPPTI Office Location
INSERT INTO office_locations (id, name, address, latitude, longitude, max_radius_meters, is_active)
VALUES (
  'loc-kppti',
  'Kantor Pusat KPPTI (Indosat Ooredoo Hutchison)',
  'Jl. Medan Merdeka Barat No.21, Gambir, Jakarta Pusat',
  -6.180495,
  106.822769,
  50,
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Default Office Geofence Config
INSERT INTO office_config (
  id, target_latitude, target_longitude, max_radius_meters,
  work_start_time, work_end_time, email_atasan
) VALUES (
  1, -6.180495, 106.822769, 50, '08:30', '17:30', 'supervisor@example.com'
) ON CONFLICT (id) DO NOTHING;

