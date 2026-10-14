import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import type { DatabaseSync } from 'node:sqlite';
import {
  createIntern,
  getIntern,
  updateInternPhoto,
  recordCheckIn,
  recordCheckOut,
  getAttendanceRecord,
} from '../src/lib/db/repo.ts';
import type { InternProfile, AttendanceRecord } from '../src/types/index.ts';
import { POST as uploadPhotoRoute } from '../src/app/api/attendance/upload-photo/route.ts';

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

  describe('Repository: Intern photo & Attendance check-in/out selfies', () => {
    const INTERN_FIXTURE: InternProfile = {
      id: 'intern-selfie-repo',
      namaLengkap: 'Selfie Intern',
      divisi: 'Network Operations',
      namaMentor: 'Mentor Lead',
      emailMentor: 'lead@indosat.com',
      universitas: 'ITB',
      jurusan: 'Telekomunikasi',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
      photoUrl: '/uploads/selfies/initial.jpg',
    };

    beforeEach(() => {
      createIntern(db, INTERN_FIXTURE);
    });

    it('should map photo_url when retrieving intern profile', () => {
      const intern = getIntern(db, 'intern-selfie-repo');
      assert.ok(intern);
      assert.equal(intern.photoUrl, '/uploads/selfies/initial.jpg');
    });

    it('should update intern photo URL via updateInternPhoto', () => {
      updateInternPhoto(db, 'intern-selfie-repo', '/uploads/selfies/new-profile.jpg');
      const updated = getIntern(db, 'intern-selfie-repo');
      assert.equal(updated?.photoUrl, '/uploads/selfies/new-profile.jpg');
    });

    it('should persist check-in photoUrl and update intern profile photo atomically', () => {
      const checkInRecord: AttendanceRecord = {
        id: 'att-selfie-in-01',
        internId: 'intern-selfie-repo',
        date: '2026-10-14',
        checkInTime: '08:20:00',
        status: 'ON_TIME',
        photoUrl: '/uploads/selfies/checkin-selfie-01.jpg',
      };
      recordCheckIn(db, checkInRecord);

      const record = getAttendanceRecord(db, 'intern-selfie-repo', '2026-10-14');
      assert.equal(record?.photoUrl, '/uploads/selfies/checkin-selfie-01.jpg');

      // Auto-restoration: Intern profile photo updated to latest check-in selfie
      const intern = getIntern(db, 'intern-selfie-repo');
      assert.equal(intern?.photoUrl, '/uploads/selfies/checkin-selfie-01.jpg');
    });

    it('should persist check-out checkOutPhotoUrl and update intern profile photo', () => {
      const checkInRecord: AttendanceRecord = {
        id: 'att-selfie-out-01',
        internId: 'intern-selfie-repo',
        date: '2026-10-14',
        checkInTime: '08:20:00',
        status: 'ON_TIME',
        photoUrl: '/uploads/selfies/morning.jpg',
      };
      recordCheckIn(db, checkInRecord);

      recordCheckOut(db, 'intern-selfie-repo', '2026-10-14', {
        checkOutTime: '17:35:00',
        checkOutPhotoUrl: '/uploads/selfies/evening-checkout.jpg',
      });

      const record = getAttendanceRecord(db, 'intern-selfie-repo', '2026-10-14');
      assert.equal(record?.checkOutPhotoUrl, '/uploads/selfies/evening-checkout.jpg');

      // Profile photo updated to latest verified checkout selfie
      const intern = getIntern(db, 'intern-selfie-repo');
      assert.equal(intern?.photoUrl, '/uploads/selfies/evening-checkout.jpg');
    });
  });

  describe('POST /api/attendance/upload-photo', () => {
    const VALID_BASE64_IMAGE =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    beforeEach(() => {
      createIntern(db, {
        id: 'intern-upload-test',
        namaLengkap: 'Upload Tester',
        divisi: 'IT',
        namaMentor: 'Mentor',
        emailMentor: 'mentor@indosat.com',
        universitas: 'UI',
        jurusan: 'CS',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      });
    });

    it('should accept valid base64 image and return 201 with public photoUrl', async () => {
      const req = new Request('http://localhost:3000/api/attendance/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-upload-test',
          image: VALID_BASE64_IMAGE,
          type: 'CHECK_IN',
        }),
      });

      const res = await uploadPhotoRoute(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.photoUrl);
      assert.match(data.photoUrl, /^\/uploads\/selfies\/intern-upload-test-.*\.png$/);
      assert.equal(data.mimeType, 'image/png');
    });

    it('should reject payload missing internId or image with 400', async () => {
      const req = new Request('http://localhost:3000/api/attendance/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: 'intern-upload-test' }),
      });

      const res = await uploadPhotoRoute(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /internId dan image wajib diisi/i);
    });

    it('should reject unsupported MIME type with 400', async () => {
      const req = new Request('http://localhost:3000/api/attendance/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-upload-test',
          image: 'data:application/pdf;base64,JVBERi0xLjQK...',
        }),
      });

      const res = await uploadPhotoRoute(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Format gambar tidak didukung/i);
    });
  });
});

