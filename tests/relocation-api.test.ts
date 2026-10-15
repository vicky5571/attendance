import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import type { DatabaseSync } from 'node:sqlite';
import {
  createRelocationRequest,
  getRelocationRequestById,
  listRelocationRequests,
  getPendingRelocationForIntern,
  reviewRelocationRequest,
} from '../src/lib/db/relocation-repo.ts';
import { createIntern, getIntern } from '../src/lib/db/repo.ts';
import { createOfficeLocation } from '../src/lib/db/locations-repo.ts';
import {
  POST as postRelocation,
  GET as getRelocation,
} from '../src/app/api/interns/relocation/route.ts';
import {
  PATCH as patchRelocation,
} from '../src/app/api/interns/relocation/[id]/route.ts';
import type { InternProfile, OfficeLocation, RelocationRequest } from '../src/types/index.ts';

let db: DatabaseSync;

const INTERN_FIXTURE: InternProfile = {
  id: 'intern-reloc-test',
  namaLengkap: 'Reloc Test Intern',
  divisi: 'Engineering',
  namaMentor: 'Mentor Test',
  emailMentor: 'mentor@test.com',
  universitas: 'UI',
  jurusan: 'CS',
  periodeMagangSelesai: '2026-12-31',
  status: 'ACTIVE',
  assignedLocationId: 'loc-hq',
};

const LOC_HQ: OfficeLocation = {
  id: 'loc-hq',
  name: 'KPPTI Jakarta Pusat (HQ)',
  latitude: -6.175,
  longitude: 106.827,
  maxRadiusMeters: 50,
  isActive: true,
};

const LOC_BSD: OfficeLocation = {
  id: 'loc-bsd',
  name: 'Gedung Indosat Serpong BSD',
  latitude: -6.301,
  longitude: 106.652,
  maxRadiusMeters: 50,
  isActive: true,
};

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

  describe('Repository: relocation-repo.ts', () => {
    beforeEach(() => {
      createOfficeLocation(db, LOC_HQ);
      createOfficeLocation(db, LOC_BSD);
      createIntern(db, INTERN_FIXTURE);
    });

    it('should create and retrieve a relocation request', () => {
      const req: RelocationRequest = {
        id: 'reloc-test-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Closer to new residence',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      };
      const created = createRelocationRequest(db, req);
      assert.equal(created.id, 'reloc-test-01');
      assert.equal(created.status, 'PENDING');

      const fetched = getRelocationRequestById(db, 'reloc-test-01');
      assert.ok(fetched);
      assert.equal(fetched.internId, 'intern-reloc-test');
      assert.equal(fetched.targetLocationId, 'loc-bsd');
    });

    it('should list relocation requests with filters', () => {
      createRelocationRequest(db, {
        id: 'reloc-list-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Test list',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const all = listRelocationRequests(db);
      assert.ok(all.length >= 1);

      const byIntern = listRelocationRequests(db, { internId: 'intern-reloc-test' });
      assert.equal(byIntern.length, 1);

      const byStatus = listRelocationRequests(db, { status: 'APPROVED' });
      assert.equal(byStatus.length, 0);
    });

    it('should find pending relocation for a specific intern', () => {
      createRelocationRequest(db, {
        id: 'reloc-pending-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Pending check',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const pending = getPendingRelocationForIntern(db, 'intern-reloc-test');
      assert.ok(pending);
      assert.equal(pending.status, 'PENDING');

      const noPending = getPendingRelocationForIntern(db, 'non-existent');
      assert.equal(noPending, null);
    });

    it('should approve relocation and update intern assigned_location_id', () => {
      createRelocationRequest(db, {
        id: 'reloc-approve-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Approved test',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const reviewed = reviewRelocationRequest(db, 'reloc-approve-01', 'APPROVED', 'Admin IOH');
      assert.ok(reviewed);
      assert.equal(reviewed.status, 'APPROVED');
      assert.equal(reviewed.reviewedBy, 'Admin IOH');
      assert.ok(reviewed.reviewedAt);

      // Verify intern's assigned location was updated
      const intern = getIntern(db, 'intern-reloc-test');
      assert.equal(intern?.assignedLocationId, 'loc-bsd');
    });

    it('should reject relocation with rejection reason without changing intern location', () => {
      createRelocationRequest(db, {
        id: 'reloc-reject-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Reject test',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const reviewed = reviewRelocationRequest(db, 'reloc-reject-01', 'REJECTED', 'Admin IOH', 'Posisi masih dibutuhkan di HQ');
      assert.ok(reviewed);
      assert.equal(reviewed.status, 'REJECTED');
      assert.equal(reviewed.rejectionReason, 'Posisi masih dibutuhkan di HQ');

      // Verify intern's location was NOT changed
      const intern = getIntern(db, 'intern-reloc-test');
      assert.equal(intern?.assignedLocationId, 'loc-hq');
    });

    it('should return null when reviewing non-existent request', () => {
      const result = reviewRelocationRequest(db, 'non-existent', 'APPROVED', 'Admin');
      assert.equal(result, null);
    });
  });

  describe('POST /api/interns/relocation', () => {
    beforeEach(() => {
      createOfficeLocation(db, LOC_HQ);
      createOfficeLocation(db, LOC_BSD);
      createIntern(db, INTERN_FIXTURE);
    });

    it('should submit a valid relocation request with 201', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-reloc-test',
          currentLocationId: 'loc-hq',
          targetLocationId: 'loc-bsd',
          reason: 'Moving closer to new residence',
        }),
      });

      const res = await postRelocation(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.request);
      assert.equal(data.request.status, 'PENDING');
      assert.equal(data.request.internId, 'intern-reloc-test');
      assert.equal(data.request.targetLocationId, 'loc-bsd');
    });

    it('should reject with 400 when required fields are missing', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: 'intern-reloc-test' }),
      });

      const res = await postRelocation(req);
      assert.equal(res.status, 400);
    });

    it('should reject with 400 when target equals current location', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-reloc-test',
          currentLocationId: 'loc-hq',
          targetLocationId: 'loc-hq',
          reason: 'Same location test',
        }),
      });

      const res = await postRelocation(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /tidak boleh sama/i);
    });

    it('should reject with 404 when intern does not exist', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'non-existent-intern',
          currentLocationId: 'loc-hq',
          targetLocationId: 'loc-bsd',
          reason: 'Test',
        }),
      });

      const res = await postRelocation(req);
      assert.equal(res.status, 404);
    });

    it('should reject with 404 when target location does not exist', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-reloc-test',
          currentLocationId: 'loc-hq',
          targetLocationId: 'loc-nonexistent',
          reason: 'Test',
        }),
      });

      const res = await postRelocation(req);
      assert.equal(res.status, 404);
    });

    it('should reject with 409 when intern already has a pending relocation', async () => {
      // First request succeeds
      const req1 = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-reloc-test',
          currentLocationId: 'loc-hq',
          targetLocationId: 'loc-bsd',
          reason: 'First request',
        }),
      });
      const res1 = await postRelocation(req1);
      assert.equal(res1.status, 201);

      // Duplicate request fails
      const req2 = new Request('http://localhost:3000/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-reloc-test',
          currentLocationId: 'loc-hq',
          targetLocationId: 'loc-bsd',
          reason: 'Second request while pending',
        }),
      });
      const res2 = await postRelocation(req2);
      assert.equal(res2.status, 409);
    });
  });

  describe('GET /api/interns/relocation', () => {
    beforeEach(() => {
      createOfficeLocation(db, LOC_HQ);
      createOfficeLocation(db, LOC_BSD);
      createIntern(db, INTERN_FIXTURE);
    });

    it('should return all relocation requests', async () => {
      // Seed a request first
      createRelocationRequest(db, {
        id: 'reloc-get-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'GET test',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const req = new Request('http://localhost:3000/api/interns/relocation');
      const res = await getRelocation(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.requests));
      assert.ok(data.requests.length >= 1);
    });

    it('should filter by internId and status query params', async () => {
      createRelocationRequest(db, {
        id: 'reloc-filter-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Filter test',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const req = new Request(
        'http://localhost:3000/api/interns/relocation?internId=intern-reloc-test&status=PENDING'
      );
      const res = await getRelocation(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.requests.length, 1);
      assert.equal(data.requests[0].internId, 'intern-reloc-test');
    });
  });

  describe('PATCH /api/interns/relocation/[id]', () => {
    beforeEach(() => {
      createOfficeLocation(db, LOC_HQ);
      createOfficeLocation(db, LOC_BSD);
      createIntern(db, INTERN_FIXTURE);
    });

    it('should approve a pending relocation request with 200', async () => {
      // Seed a pending request
      createRelocationRequest(db, {
        id: 'reloc-patch-01',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Patch approve test',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const req = new Request('http://localhost:3000/api/interns/relocation/reloc-patch-01', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewedBy: 'Administrator IOH',
        }),
      });

      const res = await patchRelocation(req, { params: Promise.resolve({ id: 'reloc-patch-01' }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.request.status, 'APPROVED');
      assert.equal(data.request.reviewedBy, 'Administrator IOH');
      assert.ok(data.request.reviewedAt);

      // Verify intern location was updated
      const intern = getIntern(db, 'intern-reloc-test');
      assert.equal(intern?.assignedLocationId, 'loc-bsd');
    });

    it('should reject a pending relocation request with rejection reason', async () => {
      createRelocationRequest(db, {
        id: 'reloc-patch-02',
        internId: 'intern-reloc-test',
        currentLocationId: 'loc-hq',
        targetLocationId: 'loc-bsd',
        reason: 'Patch reject test',
        status: 'PENDING',
        createdAt: '2026-10-14T10:00:00Z',
      });

      const req = new Request('http://localhost:3000/api/interns/relocation/reloc-patch-02', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          reviewedBy: 'Supervisor IOH',
          rejectionReason: 'Posisi masih dibutuhkan di kantor asal',
        }),
      });

      const res = await patchRelocation(req, { params: Promise.resolve({ id: 'reloc-patch-02' }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.request.status, 'REJECTED');
      assert.equal(data.request.rejectionReason, 'Posisi masih dibutuhkan di kantor asal');
    });

    it('should approve initial mock request reloc-init-01 with auto-healing and update intern office', async () => {
      // reloc-init-01 was not manually created in this test, but should auto-heal and approve
      const req = new Request('http://localhost:3000/api/interns/relocation/reloc-init-01', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewedBy: 'Admin IOH',
        }),
      });

      const res = await patchRelocation(req, { params: Promise.resolve({ id: 'reloc-init-01' }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.request.status, 'APPROVED');
      assert.equal(data.request.id, 'reloc-init-01');
    });

    it('should return 400 when status is invalid', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation/any-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      const res = await patchRelocation(req, { params: Promise.resolve({ id: 'any-id' }) });
      assert.equal(res.status, 400);
    });

    it('should return 404 when relocation request does not exist', async () => {
      const req = new Request('http://localhost:3000/api/interns/relocation/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewedBy: 'Admin',
        }),
      });

      const res = await patchRelocation(req, { params: Promise.resolve({ id: 'non-existent' }) });
      assert.equal(res.status, 404);
    });
  });
});
