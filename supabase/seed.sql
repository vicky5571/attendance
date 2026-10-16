-- ==============================================================================
-- Supabase Database Seeder (SQL)
-- Run this in Supabase Dashboard -> SQL Editor to populate initial master data
-- ==============================================================================

-- 1. Office Hub Locations
INSERT INTO office_locations (id, name, address, latitude, longitude, max_radius_meters, is_active)
VALUES 
  (
    'loc-kppti',
    'KPPTI Jakarta Pusat (HQ)',
    'Jl. Medan Merdeka Barat No. 21, Gambir, Jakarta Pusat',
    -6.180495,
    106.822769,
    50,
    TRUE
  ),
  (
    'loc-bsd',
    'Gedung Indosat Serpong BSD',
    'BSD Green Office Park, Tangerang Selatan',
    -6.301540,
    106.652170,
    75,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  max_radius_meters = EXCLUDED.max_radius_meters,
  is_active = EXCLUDED.is_active;

-- 2. Office Working Hours & Geofence Configuration
INSERT INTO office_config (
  id, target_latitude, target_longitude, max_radius_meters,
  work_start_time, work_end_time, email_atasan
) VALUES (
  1, -6.180495, 106.822769, 50, '08:30', '17:30', 'supervisor@indosat.com'
) ON CONFLICT (id) DO UPDATE SET
  target_latitude = EXCLUDED.target_latitude,
  target_longitude = EXCLUDED.target_longitude,
  max_radius_meters = EXCLUDED.max_radius_meters,
  work_start_time = EXCLUDED.work_start_time,
  work_end_time = EXCLUDED.work_end_time,
  email_atasan = EXCLUDED.email_atasan;

-- 3. Administrator User (admin@ioh.co.id / AdminIOH2026!)
INSERT INTO users (id, username, email, password_hash, role, name, created_at)
VALUES (
  'user-admin-default',
  'admin',
  'admin@ioh.co.id',
  'a1b2c3d4e5f60718293a4b5c6d7e8f90$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  'ADMIN',
  'Administrator IOH',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 4. Initial Interns (zacky@ioh.co.id & sarah@ioh.co.id / InternIOH2026!)
INSERT INTO interns (
  id, nama_lengkap, divisi, nama_mentor, email_mentor,
  universitas, jurusan, periode_magang_selesai, status,
  email, assigned_location_id
) VALUES 
  (
    'intern-zacky',
    'Zacky Kurniawan',
    'Digital Experience & Frontend',
    'Vicky Backend Lead',
    'mentor.vicky@indosat.com',
    'Universitas Indonesia',
    'Sistem Informasi',
    '2026-12-31',
    'ACTIVE',
    'zacky@ioh.co.id',
    'loc-kppti'
  ),
  (
    'intern-sarah',
    'Sarah Nurhaliza',
    'Network Operations',
    'Budi Santoso',
    'budi.santoso@indosat.com',
    'Institut Teknologi Bandung',
    'Teknik Telekomunikasi',
    '2026-12-31',
    'ACTIVE',
    'sarah@ioh.co.id',
    'loc-kppti'
  )
ON CONFLICT (id) DO UPDATE SET
  nama_lengkap = EXCLUDED.nama_lengkap,
  divisi = EXCLUDED.divisi,
  email = EXCLUDED.email,
  assigned_location_id = EXCLUDED.assigned_location_id;

-- 5. Sample Relocation Request
INSERT INTO relocation_requests (
  id, intern_id, current_location_id, target_location_id,
  reason, notes, status, created_at
) VALUES (
  'reloc-init-01',
  'intern-zacky',
  'loc-kppti',
  'loc-bsd',
  'Pindah domisili ke Tangerang Selatan agar lebih dekat dengan lokasi kerja tim Network.',
  'Sudah berkoordinasi dengan mentor Vicky.',
  'PENDING',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

