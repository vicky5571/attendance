import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './client.ts';
import { initSchema } from './schema.ts';
import { setOfficeConfig, createIntern, getIntern } from './repo.ts';
import type { OfficeConfig, InternProfile } from '../../types/index.ts';

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
  },
];

export function seedDatabase(db: DatabaseSync): void {
  initSchema(db);
  setOfficeConfig(db, DEFAULT_OFFICE_CONFIG);

  for (const intern of INITIAL_INTERNS) {
    const existing = getIntern(db, intern.id);
    if (!existing) {
      createIntern(db, intern);
    }
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  const db = getDatabase();
  seedDatabase(db);
  console.log('✅ SQLite database seeded successfully.');
}
