import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { seedDatabase } from '../src/lib/db/seed.ts';
import type { DatabaseSync } from 'node:sqlite';

describe('Schema Migrations & Domain Entity Integrity', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initSchema(db);
  });

  it('should create office_locations table and persist multi-hub records', () => {
    db.prepare(`
      INSERT INTO office_locations (id, name, address, latitude, longitude, max_radius_meters, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('loc-kppti', 'KPPTI Jakarta HQ', 'Jl. Medan Merdeka Barat No. 21', -6.180495, 106.822769, 50, 1);

    const row = db.prepare('SELECT * FROM office_locations WHERE id = ?').get('loc-kppti') as any;
    assert.ok(row);
    assert.equal(row.name, 'KPPTI Jakarta HQ');
    assert.equal(row.latitude, -6.180495);
    assert.equal(row.max_radius_meters, 50);
    assert.equal(row.is_active, 1);
  });

  it('should create attendance_requests table with constraints and foreign key', () => {
    // Insert prerequisite intern
    db.prepare(`
      INSERT INTO interns (id, nama_lengkap, divisi, nama_mentor, email_mentor, universitas, jurusan, periode_magang_selesai, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('intern-1', 'Test Intern', 'Tech', 'Mentor A', 'mentor@test.com', 'Univ A', 'CS', '2026-12-31', 'ACTIVE');

    db.prepare(`
      INSERT INTO attendance_requests (id, intern_id, date, type, reason, attachment_path, status, reviewed_by, reviewed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('req-1', 'intern-1', '2026-10-09', 'WFH', 'Bekerja remote sprint review', null, 'PENDING', null, null, '2026-10-09T08:00:00Z');

    const row = db.prepare('SELECT * FROM attendance_requests WHERE id = ?').get('req-1') as any;
    assert.ok(row);
    assert.equal(row.type, 'WFH');
    assert.equal(row.status, 'PENDING');

    // Duplicate (intern_id, date) should throw constraint error
    assert.throws(() => {
      db.prepare(`
        INSERT INTO attendance_requests (id, intern_id, date, type, reason, attachment_path, status, reviewed_by, reviewed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('req-2', 'intern-1', '2026-10-09', 'SAKIT', 'Demam', null, 'PENDING', null, null, '2026-10-09T08:30:00Z');
    });
  });

  it('should support pin_hash column in interns and location_id in attendance_logs', () => {
    db.prepare(`
      INSERT INTO interns (id, nama_lengkap, divisi, nama_mentor, email_mentor, universitas, jurusan, periode_magang_selesai, status, pin_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('intern-2', 'PIN Intern', 'Core', 'Mentor B', 'm@b.com', 'UI', 'EE', '2026-12-31', 'ACTIVE', 'hashed_pin_123');

    const intern = db.prepare('SELECT pin_hash FROM interns WHERE id = ?').get('intern-2') as any;
    assert.equal(intern.pin_hash, 'hashed_pin_123');

    db.prepare(`
      INSERT INTO attendance_logs (id, intern_id, date, check_in_time, status, location_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('att-1', 'intern-2', '2026-10-09', '08:15:00', 'ON_TIME', 'loc-kppti');

    const att = db.prepare('SELECT location_id FROM attendance_logs WHERE id = ?').get('att-1') as any;
    assert.equal(att.location_id, 'loc-kppti');
  });

  it('should seed default locations and mock intern PINs in seedDatabase', () => {
    seedDatabase(db);

    const locations = db.prepare('SELECT COUNT(*) as count FROM office_locations').get() as { count: number };
    assert.ok(locations.count >= 2, 'Must seed at least 2 office locations (KPPTI and BSD)');

    const intern = db.prepare('SELECT pin_hash FROM interns WHERE id = ?').get('intern-sarah') as any;
    assert.ok(intern?.pin_hash, 'Seeded intern must have pin_hash');
  });
});
