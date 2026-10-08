import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './client.ts';
import { initSchema } from './schema.ts';
import { setOfficeConfig, createIntern, getIntern } from './repo.ts';
import type { OfficeConfig, InternProfile, OfficeLocation } from '../../types/index.ts';

export const DEFAULT_OFFICE_CONFIG: OfficeConfig = {
  targetLatitude: Number(process.env.TARGET_LATITUDE) || -6.180495,
  targetLongitude: Number(process.env.TARGET_LONGITUDE) || 106.822769,
  maxRadiusMeters: Number(process.env.MAX_RADIUS_METERS) || 50,
  workStartTime: process.env.WORK_START_TIME || '08:30',
  workEndTime: process.env.WORK_END_TIME || '17:30',
  emailAtasan: process.env.EMAIL_ATASAN || 'supervisor@indosat.com',
  waGroupInternsJid: process.env.WA_GROUP_INTERNS_JID,
  waGroupMentorsJid: process.env.WA_GROUP_MENTORS_JID,
};

export const INITIAL_OFFICE_LOCATIONS: OfficeLocation[] = [
  {
    id: 'loc-kppti',
    name: 'KPPTI Jakarta Pusat (HQ)',
    address: 'Jl. Medan Merdeka Barat No. 21, Gambir, Jakarta Pusat',
    latitude: -6.180495,
    longitude: 106.822769,
    maxRadiusMeters: 50,
    isActive: true,
  },
  {
    id: 'loc-bsd',
    name: 'Gedung Indosat Serpong BSD',
    address: 'BSD Green Office Park, Tangerang Selatan',
    latitude: -6.301540,
    longitude: 106.652170,
    maxRadiusMeters: 75,
    isActive: true,
  },
];

export const INITIAL_INTERNS: InternProfile[] = [
  {
    id: 'intern-zacky',
    namaLengkap: 'Zacky Kurniawan',
    divisi: 'Digital Experience & Frontend',
    namaMentor: 'Vicky Backend Lead',
    emailMentor: 'mentor.vicky@indosat.com',
    universitas: 'Universitas Indonesia',
    jurusan: 'Sistem Informasi',
    periodeMagangSelesai: '2026-12-31',
    status: 'ACTIVE',
    pinHash: '123456',
  },
  {
    id: 'intern-sarah',
    namaLengkap: 'Sarah Nurhaliza',
    divisi: 'Network Operations',
    namaMentor: 'Budi Santoso',
    emailMentor: 'budi.santoso@indosat.com',
    universitas: 'Institut Teknologi Bandung',
    jurusan: 'Teknik Telekomunikasi',
    periodeMagangSelesai: '2026-12-31',
    status: 'ACTIVE',
    pinHash: '123456',
  },
];

export function seedDatabase(db: DatabaseSync): void {
  initSchema(db);
  setOfficeConfig(db, DEFAULT_OFFICE_CONFIG);

  // Seed Office Locations
  for (const loc of INITIAL_OFFICE_LOCATIONS) {
    const existing = db.prepare('SELECT id FROM office_locations WHERE id = ?').get(loc.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO office_locations (id, name, address, latitude, longitude, max_radius_meters, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        loc.id,
        loc.name,
        loc.address ?? null,
        loc.latitude,
        loc.longitude,
        loc.maxRadiusMeters,
        loc.isActive ? 1 : 0
      );
    }
  }

  // Seed Interns
  for (const intern of INITIAL_INTERNS) {
    const existing = getIntern(db, intern.id);
    if (!existing) {
      createIntern(db, intern);
    } else if (!existing.pinHash && intern.pinHash) {
      db.prepare('UPDATE interns SET pin_hash = ? WHERE id = ?').run(intern.pinHash, intern.id);
    }
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  const db = getDatabase();
  seedDatabase(db);
  console.log('✅ SQLite database seeded successfully.');
}
