/**
 * Supabase Database Seeder Script
 * 
 * Populates Supabase PostgreSQL with initial master data:
 * - Default Office Geofence Config
 * - Office Hubs (KPPTI Jakarta Pusat HQ & BSD Serpong)
 * - Default Admin User (admin@ioh.co.id / AdminIOH2026!)
 * - Initial Interns (zacky@ioh.co.id & sarah@ioh.co.id / InternIOH2026!)
 * - Sample Relocation Request
 * 
 * Usage:
 *   node --experimental-strip-types src/lib/db/seed-supabase.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase/admin.ts';
import { hashPassword } from '../auth.ts';

// Automatically load .env.local if running as a standalone node script
function loadEnvLocal() {
  const envLocalPath = resolve(process.cwd(), '.env.local');
  if (existsSync(envLocalPath)) {
    if (typeof (process as any).loadEnvFile === 'function') {
      try {
        (process as any).loadEnvFile(envLocalPath);
        return;
      } catch {
        // fallback to manual parse below
      }
    }
    const content = readFileSync(envLocalPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnvLocal();

async function seedSupabase() {
  console.log('[Supabase Seeder] Checking Supabase connection...');

  if (!isSupabaseConfigured()) {
    console.error('❌ Error: Supabase credentials not found in environment!');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Error: Could not initialize Supabase client.');
    process.exit(1);
  }

  console.log('✅ Connected to Supabase. Starting seed...');

  let hasErrors = false;

  function handleError(step: string, error: { message: string }) {
    hasErrors = true;
    if (error.message.includes('does not exist')) {
      console.error(`\n❌ Error during ${step}: Table does not exist in Supabase!`);
      console.error('👉 ACTION REQUIRED: Run the SQL migration in Supabase SQL Editor first:');
      console.error('   File: supabase/migrations/20261016_initial_schema.sql\n');
    } else {
      console.error(`❌ Failed ${step}:`, error.message);
    }
  }

  // 1. Seed Office Locations
  console.log('📍 Seeding Office Locations...');
  const locations = [
    {
      id: 'loc-kppti',
      name: 'KPPTI Jakarta Pusat (HQ)',
      address: 'Jl. Medan Merdeka Barat No. 21, Gambir, Jakarta Pusat',
      latitude: -6.180495,
      longitude: 106.822769,
      max_radius_meters: 50,
      is_active: true,
    },
    {
      id: 'loc-bsd',
      name: 'Gedung Indosat Serpong BSD',
      address: 'BSD Green Office Park, Tangerang Selatan',
      latitude: -6.301540,
      longitude: 106.652170,
      max_radius_meters: 75,
      is_active: true,
    },
  ];

  for (const loc of locations) {
    const { error } = await supabase.from('office_locations').upsert(loc, { onConflict: 'id' });
    if (error) {
      handleError(`seeding location '${loc.id}'`, error);
      break; // stop early if table doesn't exist
    } else {
      console.log(`  ✓ Location '${loc.name}' seeded.`);
    }
  }

  if (hasErrors) {
    console.error('\n⚠️ Seeding aborted because database tables have not been created yet in Supabase.');
    process.exit(1);
  }

  // 2. Seed Office Config
  console.log('⚙️ Seeding Office Config...');
  const officeConfig = {
    id: 1,
    target_latitude: Number(process.env.TARGET_LATITUDE) || -6.180495,
    target_longitude: Number(process.env.TARGET_LONGITUDE) || 106.822769,
    max_radius_meters: Number(process.env.MAX_RADIUS_METERS) || 50,
    work_start_time: process.env.WORK_START_TIME || '08:30',
    work_end_time: process.env.WORK_END_TIME || '17:30',
    email_atasan: process.env.EMAIL_ATASAN || 'supervisor@indosat.com',
    wa_group_interns_jid: process.env.WA_GROUP_INTERNS_JID || null,
    wa_group_mentors_jid: process.env.WA_GROUP_MENTORS_JID || null,
  };

  const { error: configError } = await supabase.from('office_config').upsert(officeConfig, { onConflict: 'id' });
  if (configError) handleError('seeding office config', configError);
  else console.log('  ✓ Office config seeded.');

  // 3. Seed Default Admin User
  console.log('👤 Seeding Administrator User...');
  const adminPasswordHash = hashPassword('AdminIOH2026!');
  const adminUser = {
    id: 'user-admin-default',
    username: 'admin',
    email: 'admin@ioh.co.id',
    password_hash: adminPasswordHash,
    role: 'ADMIN',
    name: 'Administrator IOH',
    created_at: new Date().toISOString(),
  };

  const { error: adminError } = await supabase.from('users').upsert(adminUser, { onConflict: 'email' });
  if (adminError) handleError('seeding admin user', adminError);
  else console.log('  ✓ Admin user seeded (admin@ioh.co.id / AdminIOH2026!).');

  // 4. Seed Initial Interns
  console.log('🎓 Seeding Interns...');
  const internPasswordHash = hashPassword('InternIOH2026!');
  const interns = [
    {
      id: 'intern-zacky',
      nama_lengkap: 'Zacky Kurniawan',
      divisi: 'Digital Experience & Frontend',
      nama_mentor: 'Vicky Backend Lead',
      email_mentor: 'mentor.vicky@indosat.com',
      universitas: 'Universitas Indonesia',
      jurusan: 'Sistem Informasi',
      periode_magang_selesai: '2026-12-31',
      status: 'ACTIVE',
      email: 'zacky@ioh.co.id',
      password_hash: internPasswordHash,
      assigned_location_id: 'loc-kppti',
    },
    {
      id: 'intern-sarah',
      nama_lengkap: 'Sarah Nurhaliza',
      divisi: 'Network Operations',
      nama_mentor: 'Budi Santoso',
      email_mentor: 'budi.santoso@indosat.com',
      universitas: 'Institut Teknologi Bandung',
      jurusan: 'Teknik Telekomunikasi',
      periode_magang_selesai: '2026-12-31',
      status: 'ACTIVE',
      email: 'sarah@ioh.co.id',
      password_hash: internPasswordHash,
      assigned_location_id: 'loc-kppti',
    },
  ];

  for (const intern of interns) {
    const { error } = await supabase.from('interns').upsert(intern, { onConflict: 'id' });
    if (error) handleError(`seeding intern '${intern.id}'`, error);
    else console.log(`  ✓ Intern '${intern.nama_lengkap}' seeded (${intern.email} / InternIOH2026!).`);
  }

  // 5. Seed Initial Relocation Request
  console.log('🔄 Seeding Sample Relocation Request...');
  const relocRequest = {
    id: 'reloc-init-01',
    intern_id: 'intern-zacky',
    current_location_id: 'loc-kppti',
    target_location_id: 'loc-bsd',
    reason: 'Pindah domisili ke Tangerang Selatan agar lebih dekat dengan lokasi kerja tim Network.',
    notes: 'Sudah berkoordinasi dengan mentor Vicky.',
    status: 'PENDING',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  };

  const { error: relocError } = await supabase.from('relocation_requests').upsert(relocRequest, { onConflict: 'id' });
  if (relocError) handleError('seeding relocation request', relocError);
  else console.log('  ✓ Sample relocation request seeded.');

  if (hasErrors) {
    console.error('\n⚠️ Seeding finished with errors. Please check the logs above.');
    process.exit(1);
  }

  console.log('\n🎉 Supabase seeding completed successfully! All tables populated.');
}

seedSupabase().catch((err) => {
  console.error('Fatal error during Supabase seeding:', err);
  process.exit(1);
});

