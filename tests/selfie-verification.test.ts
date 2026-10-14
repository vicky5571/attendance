import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import type { DatabaseSync } from 'node:sqlite';

let db: DatabaseSync;

describe('Selfie Verification & Profile Photo Restoration', () => {
  beforeEach(() => {
    db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);
  });

  describe('Schema: photo_url on interns & check_out_photo_url on attendance_logs', () => {
    it('should support photo_url column on interns table', () => {
      db.prepare(`
        INSERT INTO interns (
          id, nama_lengkap, divisi, nama_mentor, email_mentor,
          universitas, jurusan, periode_magang_selesai, status, photo_url
        ) VALUES (
          'intern-photo-test', 'Test Photo Intern', 'Engineering', 'Mentor',
          'mentor@test.com', 'UI', 'CS', '2026-12-31', 'ACTIVE',
          '/uploads/selfies/intern-photo-test-profile.jpg'
        )
      `).run();

      const row = db.prepare('SELECT photo_url FROM interns WHERE id = ?').get('intern-photo-test') as any;
      assert.equal(row.photo_url, '/uploads/selfies/intern-photo-test-profile.jpg');
    });

    it('should support check_out_photo_url column on attendance_logs table', () => {
      db.prepare(`
        INSERT INTO interns (
          id, nama_lengkap, divisi, nama_mentor, email_mentor,
          universitas, jurusan, periode_magang_selesai, status
        ) VALUES (
          'intern-photo-test-2', 'Test Photo Intern 2', 'Engineering', 'Mentor',
          'mentor@test.com', 'UI', 'CS', '2026-12-31', 'ACTIVE'
        )
      `).run();

      db.prepare(`
        INSERT INTO attendance_logs (
          id, intern_id, date, check_in_time, status, photo_url, check_out_photo_url
        ) VALUES (
          'att-photo-01', 'intern-photo-test-2', '2026-10-14', '08:15:00', 'ON_TIME',
          '/uploads/selfies/checkin.jpg', '/uploads/selfies/checkout.jpg'
        )
      `).run();

      const row = db.prepare('SELECT photo_url, check_out_photo_url FROM attendance_logs WHERE id = ?').get('att-photo-01') as any;
      assert.equal(row.photo_url, '/uploads/selfies/checkin.jpg');
      assert.equal(row.check_out_photo_url, '/uploads/selfies/checkout.jpg');
    });
  });
});
