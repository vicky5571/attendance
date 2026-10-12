import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST as checkIn } from '../src/app/api/attendance/check-in/route.ts';
import { PATCH as approveRequest } from '../src/app/api/attendance/requests/[id]/route.ts';
import { PUT as putConfig } from '../src/app/api/config/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { seedDatabase } from '../src/lib/db/seed.ts';
import { createSession } from '../src/lib/db/auth-repo.ts';
import { createAttendanceRequest } from '../src/lib/db/requests-repo.ts';

describe('Auth Guard & Impersonation Prevention', () => {
  let db: any;

  beforeEach(() => {
    db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);
    seedDatabase(db);
  });

  describe('Check-In Anti-Impersonation', () => {
    it('should block check-in when session intern does not match payload internId (403)', async () => {
      const token = 'token-sarah-123';
      createSession(db, {
        id: 's1',
        userId: 'intern-sarah',
        role: 'INTERN',
        token,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Sarah logged in, but payload tries to punch for Zacky
      const req = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `ioh_session=${token}`,
        },
        body: JSON.stringify({
          internId: 'intern-zacky',
          latitude: -6.180495,
          longitude: 106.822769,
        }),
      });

      const res = await checkIn(req);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /tidak memiliki izin/i);
    });

    it('should allow check-in when session intern matches payload internId', async () => {
      const token = 'token-sarah-valid';
      createSession(db, {
        id: 's2',
        userId: 'intern-sarah',
        role: 'INTERN',
        token,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const req = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `ioh_session=${token}`,
        },
        body: JSON.stringify({
          internId: 'intern-sarah',
          pin: '123456',
          latitude: -6.180495,
          longitude: 106.822769,
        }),
      });

      const res = await checkIn(req);
      assert.equal(res.status, 201);
    });
  });

  describe('Protected Administrative Routes', () => {
    it('should reject leave request approval when user has role INTERN (403)', async () => {
      createAttendanceRequest(db, {
        id: 'req-cuti-1',
        internId: 'intern-sarah',
        date: '2026-10-15',
        type: 'WFH',
        reason: 'Remote project',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const token = 'token-intern-hacker';
      createSession(db, {
        id: 's3',
        userId: 'intern-sarah',
        role: 'INTERN',
        token,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const req = new Request('http://localhost:3000/api/attendance/requests/req-cuti-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `ioh_session=${token}`,
        },
        body: JSON.stringify({ status: 'APPROVED', reviewerName: 'Intern Self Approval' }),
      });

      const res = await approveRequest(req, { params: Promise.resolve({ id: 'req-cuti-1' }) });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /hanya dapat dilakukan oleh administrator/i);
    });

    it('should allow leave request approval when user has role ADMIN or SUPERVISOR', async () => {
      createAttendanceRequest(db, {
        id: 'req-cuti-2',
        internId: 'intern-sarah',
        date: '2026-10-15',
        type: 'WFH',
        reason: 'Remote project',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const token = 'token-admin-valid';
      createSession(db, {
        id: 's4',
        userId: 'user-admin-default',
        role: 'ADMIN',
        token,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const req = new Request('http://localhost:3000/api/attendance/requests/req-cuti-2', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `ioh_session=${token}`,
        },
        body: JSON.stringify({ status: 'APPROVED', reviewerName: 'Admin IOH' }),
      });

      const res = await approveRequest(req, { params: Promise.resolve({ id: 'req-cuti-2' }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.request.status, 'APPROVED');
    });

    it('should reject PUT /api/config update when requested by INTERN (403)', async () => {
      const token = 'token-intern-config';
      createSession(db, {
        id: 's5',
        userId: 'intern-sarah',
        role: 'INTERN',
        token,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const req = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          cookie: `ioh_session=${token}`,
        },
        body: JSON.stringify({
          targetLatitude: 0,
          targetLongitude: 0,
          maxRadiusMeters: 9999,
          workStartTime: '08:00',
          workEndTime: '17:00',
          emailAtasan: 'fake@email.com',
        }),
      });

      const res = await putConfig(req);
      assert.equal(res.status, 403);
    });
  });
});
