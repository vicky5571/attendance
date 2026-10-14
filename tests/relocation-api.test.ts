import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import type { DatabaseSync } from 'node:sqlite';

let db: DatabaseSync;

describe('Office Relocation API & Persistence', () => {
  beforeEach(() => {
    db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);
  });

  describe('Schema: relocation_requests table', () => {
    it('should create relocation_requests table with correct columns', () => {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='relocation_requests'"
      ).all() as unknown as { name: string }[];
      assert.equal(rows.length, 1);
      assert.equal(rows[0].name, 'relocation_requests');

      // Verify we can insert a row (FK constraints require seeding interns + locations first)
      db.prepare(`
        INSERT INTO office_locations (id, name, latitude, longitude, max_radius_meters, is_active)
        VALUES ('loc-a', 'Office A', -6.2, 106.8, 50, 1)
      `).run();
      db.prepare(`
        INSERT INTO office_locations (id, name, latitude, longitude, max_radius_meters, is_active)
        VALUES ('loc-b', 'Office B', -6.3, 106.9, 50, 1)
      `).run();
      db.prepare(`
        INSERT INTO interns (id, nama_lengkap, divisi, nama_mentor, email_mentor, universitas, jurusan, periode_magang_selesai, status)
        VALUES ('intern-test', 'Test Intern', 'Engineering', 'Mentor', 'mentor@test.com', 'UI', 'CS', '2026-12-31', 'ACTIVE')
      `).run();

      db.prepare(`
        INSERT INTO relocation_requests (id, intern_id, current_location_id, target_location_id, reason, status, created_at)
        VALUES ('reloc-1', 'intern-test', 'loc-a', 'loc-b', 'Moving closer to home', 'PENDING', '2026-10-14T10:00:00Z')
      `).run();

      const result = db.prepare('SELECT * FROM relocation_requests WHERE id = ?').get('reloc-1') as any;
      assert.equal(result.intern_id, 'intern-test');
      assert.equal(result.status, 'PENDING');
    });

    it('should reject invalid status values via CHECK constraint', () => {
      db.prepare(`
        INSERT INTO office_locations (id, name, latitude, longitude, max_radius_meters, is_active)
        VALUES ('loc-a', 'Office A', -6.2, 106.8, 50, 1)
      `).run();
      db.prepare(`
        INSERT INTO office_locations (id, name, latitude, longitude, max_radius_meters, is_active)
        VALUES ('loc-b', 'Office B', -6.3, 106.9, 50, 1)
      `).run();
      db.prepare(`
        INSERT INTO interns (id, nama_lengkap, divisi, nama_mentor, email_mentor, universitas, jurusan, periode_magang_selesai, status)
        VALUES ('intern-test', 'Test Intern', 'Engineering', 'Mentor', 'mentor@test.com', 'UI', 'CS', '2026-12-31', 'ACTIVE')
      `).run();

      assert.throws(() => {
        db.prepare(`
          INSERT INTO relocation_requests (id, intern_id, current_location_id, target_location_id, reason, status, created_at)
          VALUES ('reloc-bad', 'intern-test', 'loc-a', 'loc-b', 'Test', 'INVALID_STATUS', '2026-10-14T10:00:00Z')
        `).run();
      });
    });
  });
});
