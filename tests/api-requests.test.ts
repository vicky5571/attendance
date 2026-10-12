import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET as getRequests, POST as postRequests } from '../src/app/api/attendance/requests/route.ts';
import { PATCH as patchRequest } from '../src/app/api/attendance/requests/[id]/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern } from '../src/lib/db/repo.ts';
import type { InternProfile } from '../src/types/index.ts';

describe('Leave, Sick & Remote Work Request APIs', () => {
  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const intern: InternProfile = {
      id: 'intern-sarah',
      namaLengkap: 'Sarah Nurhaliza',
      divisi: 'Network Operations',
      namaMentor: 'Budi Santoso',
      emailMentor: 'budi.santoso@indosat.com',
      universitas: 'ITB',
      jurusan: 'Telekomunikasi',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, intern);
  });

  describe('POST /api/attendance/requests', () => {
    it('should successfully submit a WFH request with 201 Created', async () => {
      const payload = {
        internId: 'intern-sarah',
        date: '2026-10-10',
        type: 'WFH',
        reason: 'Sprint planning remote with team',
      };

      const req = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postRequests(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.request);
      assert.equal(data.request.internId, 'intern-sarah');
      assert.equal(data.request.type, 'WFH');
      assert.equal(data.request.status, 'PENDING');
    });

    it('should reject request with invalid leave type with 400 Bad Request', async () => {
      const payload = {
        internId: 'intern-sarah',
        date: '2026-10-10',
        type: 'HOLIDAY_VACATION',
        reason: 'Liburan',
      };

      const req = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postRequests(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    });

    it('should return 404 if intern is not found', async () => {
      const payload = {
        internId: 'intern-unknown',
        date: '2026-10-10',
        type: 'SAKIT',
        reason: 'Flu berat',
      };

      const req = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postRequests(req);
      assert.equal(res.status, 404);
    });

    it('should reject duplicate request on same date for same intern with 409 Conflict', async () => {
      const payload = {
        internId: 'intern-sarah',
        date: '2026-10-10',
        type: 'SAKIT',
        reason: 'Flu',
      };

      const req1 = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await postRequests(req1);

      const req2 = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res2 = await postRequests(req2);
      assert.equal(res2.status, 409);
    });
  });

  describe('GET /api/attendance/requests', () => {
    it('should return list of requests filtered by internId', async () => {
      // Create request first
      const postReq = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-sarah',
          date: '2026-10-12',
          type: 'IZIN',
          reason: 'Sidang proposal skripsi kampus',
        }),
      });
      await postRequests(postReq);

      const getReq = new Request('http://localhost:3000/api/attendance/requests?internId=intern-sarah');
      const res = await getRequests(getReq);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.requests));
      assert.equal(data.requests.length, 1);
      assert.equal(data.requests[0].type, 'IZIN');
    });
  });

  describe('PATCH /api/attendance/requests/[id]', () => {
    it('should approve a pending request and record reviewer metadata', async () => {
      // 1. Submit request
      const postReq = new Request('http://localhost:3000/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-sarah',
          date: '2026-10-15',
          type: 'WFH',
          reason: 'Remote coding',
        }),
      });
      const postRes = await postRequests(postReq);
      const { request } = await postRes.json();

      // 2. Approve via PATCH
      const patchReq = new Request(`http://localhost:3000/api/attendance/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewedBy: 'Budi Santoso (Mentor)',
        }),
      });

      const patchRes = await patchRequest(patchReq, { params: Promise.resolve({ id: request.id }) });
      assert.equal(patchRes.status, 200);
      const updated = await patchRes.json();
      assert.equal(updated.request.status, 'APPROVED');
      assert.equal(updated.request.reviewedBy, 'Budi Santoso (Mentor)');
      assert.ok(updated.request.reviewedAt);
    });

    it('should return 404 when patching non-existent request', async () => {
      const patchReq = new Request('http://localhost:3000/api/attendance/requests/non-existent-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const patchRes = await patchRequest(patchReq, { params: Promise.resolve({ id: 'non-existent-id' }) });
      assert.equal(patchRes.status, 404);
    });
  });
});
