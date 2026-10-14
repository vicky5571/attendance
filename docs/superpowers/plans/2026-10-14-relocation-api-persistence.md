# Office Relocation API & Persistence Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client-side localStorage mock (`src/lib/services/relocation-service.ts`) with a full SQLite-backed persistence layer, repository module, and REST API routes for office relocation requests — enabling interns to submit transfer requests and admins/supervisors to approve or reject them.

**Architecture:** A new `relocation_requests` table is added via DDL migration in `schema.ts`. A dedicated `relocation-repo.ts` handles all SQL operations. Three REST API endpoints (`POST`, `GET`, `PATCH`) under `/api/interns/relocation` expose the feature. On `APPROVED`, the reviewer's action atomically updates `interns.assigned_location_id`. All code follows the established patterns in `requests-repo.ts` and `attendance/requests/route.ts`.

**Tech Stack:** Node.js v26.8.1 (ESM), Next.js 16.4.0 (App Router), SQLite (`node:sqlite` DatabaseSync), Node.js Native Test Runner (`node:test`).

**Spec:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)

## Global Constraints

- Branch: `vicky` (BACK-END SPECIALIST). No frontend page layouts, CSS, or PWA changes.
- All domain types imported from `src/types/index.ts` (SSOT).
- Test harness: `npm run test:fast <path>` — under 500ms, 0 external dependencies.
- No paid SaaS. SQLite embedded only.
- All source code, comments, commit messages in English. User-facing API error messages in Bahasa Indonesia (established convention).

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `RelocationRequest` and `RelocationStatus` domain types |
| Modify | `src/lib/db/schema.ts` | Add `relocation_requests` DDL to `SCHEMA_SQL` |
| Create | `src/lib/db/relocation-repo.ts` | SQLite CRUD: create, list, get-by-id, review (approve/reject) |
| Create | `src/app/api/interns/relocation/route.ts` | `POST` (submit) + `GET` (list with filters) |
| Create | `src/app/api/interns/relocation/[id]/route.ts` | `PATCH` (approve/reject with auth guard) |
| Create | `tests/relocation-api.test.ts` | Integration tests covering repo + API routes |

---

### Task 1: Domain Types & DDL Migration

**Files:**
- Modify: `src/types/index.ts` (append after line 191)
- Modify: `src/lib/db/schema.ts` (add table DDL inside `SCHEMA_SQL` after `attendance_requests` block, line 72)
- Test: `tests/relocation-api.test.ts` (new file)

**Interfaces:**
- Consumes: Nothing (foundational task).
- Produces:
  - Type `RelocationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'`
  - Interface `RelocationRequest` with fields: `id: string`, `internId: string`, `currentLocationId: string`, `targetLocationId: string`, `reason: string`, `notes?: string | null`, `status: RelocationStatus`, `rejectionReason?: string | null`, `reviewedBy?: string | null`, `reviewedAt?: string | null`, `createdAt: string`
  - DDL table `relocation_requests` in SQLite with FK constraints and UNIQUE(intern_id) partial constraint on PENDING status.

- [ ] **Step 1: Add domain types to `src/types/index.ts`**

Append after the existing `LoginPayload` type alias (after line 191):

```typescript
export type RelocationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RelocationRequest {
  id: string;
  internId: string;
  currentLocationId: string;
  targetLocationId: string;
  reason: string;
  notes?: string | null;
  status: RelocationStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Add `relocation_requests` DDL to `src/lib/db/schema.ts`**

Insert the following table DDL inside the `SCHEMA_SQL` template literal, after the `attendance_requests` table block (after the closing `);` on line 72, before the `users` table):

```sql
CREATE TABLE IF NOT EXISTS relocation_requests (
  id TEXT PRIMARY KEY,
  intern_id TEXT NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  current_location_id TEXT NOT NULL REFERENCES office_locations(id),
  target_location_id TEXT NOT NULL REFERENCES office_locations(id),
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);
```

- [ ] **Step 3: Write failing test — schema creates `relocation_requests` table**

Create `tests/relocation-api.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/db/schema.ts tests/relocation-api.test.ts
git commit -m "feat(backend): add RelocationRequest type and relocation_requests DDL migration"
```

---

### Task 2: Repository Layer (`relocation-repo.ts`)

**Files:**
- Create: `src/lib/db/relocation-repo.ts`
- Modify: `tests/relocation-api.test.ts` (add repository tests)

**Interfaces:**
- Consumes: `RelocationRequest`, `RelocationStatus` from `src/types/index.ts`. `updateInternLocation` from `src/lib/db/repo.ts`.
- Produces:
  - `createRelocationRequest(db: DatabaseSync, req: RelocationRequest): RelocationRequest`
  - `getRelocationRequestById(db: DatabaseSync, id: string): RelocationRequest | null`
  - `listRelocationRequests(db: DatabaseSync, filter?: { internId?: string; status?: RelocationStatus }): RelocationRequest[]`
  - `getPendingRelocationForIntern(db: DatabaseSync, internId: string): RelocationRequest | null`
  - `reviewRelocationRequest(db: DatabaseSync, id: string, status: 'APPROVED' | 'REJECTED', reviewedBy: string, rejectionReason?: string): RelocationRequest | null`

- [ ] **Step 1: Write the failing tests for the repository layer**

Append to `tests/relocation-api.test.ts` inside the outer `describe` block, after the schema tests:

```typescript
import {
  createRelocationRequest,
  getRelocationRequestById,
  listRelocationRequests,
  getPendingRelocationForIntern,
  reviewRelocationRequest,
} from '../src/lib/db/relocation-repo.ts';
import { createIntern, getIntern } from '../src/lib/db/repo.ts';
import { createOfficeLocation } from '../src/lib/db/locations-repo.ts';
import type { InternProfile, OfficeLocation, RelocationRequest } from '../src/types/index.ts';

// Add these helper constants at the top of the file scope (after the imports)
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
```

Then add the following `describe` block inside the outer `describe`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/db/relocation-repo.ts'`

- [ ] **Step 3: Implement `src/lib/db/relocation-repo.ts`**

```typescript
import type { DatabaseSync } from 'node:sqlite';
import type { RelocationRequest, RelocationStatus } from '../../types/index.ts';
import { updateInternLocation } from './repo.ts';

interface RelocationRequestRow {
  id: string;
  intern_id: string;
  current_location_id: string;
  target_location_id: string;
  reason: string;
  notes: string | null;
  status: RelocationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function mapRelocationRow(row: RelocationRequestRow): RelocationRequest {
  return {
    id: row.id,
    internId: row.intern_id,
    currentLocationId: row.current_location_id,
    targetLocationId: row.target_location_id,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export function createRelocationRequest(
  db: DatabaseSync,
  req: RelocationRequest
): RelocationRequest {
  const stmt = db.prepare(`
    INSERT INTO relocation_requests (
      id, intern_id, current_location_id, target_location_id,
      reason, notes, status, rejection_reason, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    req.id,
    req.internId,
    req.currentLocationId,
    req.targetLocationId,
    req.reason,
    req.notes || null,
    req.status,
    req.rejectionReason || null,
    req.reviewedBy || null,
    req.reviewedAt || null,
    req.createdAt
  );
  return req;
}

export function getRelocationRequestById(
  db: DatabaseSync,
  id: string
): RelocationRequest | null {
  const stmt = db.prepare('SELECT * FROM relocation_requests WHERE id = ?');
  const row = stmt.get(id) as unknown as RelocationRequestRow | undefined;
  return row ? mapRelocationRow(row) : null;
}

export function getPendingRelocationForIntern(
  db: DatabaseSync,
  internId: string
): RelocationRequest | null {
  const stmt = db.prepare(
    "SELECT * FROM relocation_requests WHERE intern_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1"
  );
  const row = stmt.get(internId) as unknown as RelocationRequestRow | undefined;
  return row ? mapRelocationRow(row) : null;
}

export function listRelocationRequests(
  db: DatabaseSync,
  filter?: { internId?: string; status?: RelocationStatus }
): RelocationRequest[] {
  let query = 'SELECT * FROM relocation_requests WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.internId) {
    query += ' AND intern_id = ?';
    params.push(filter.internId);
  }
  if (filter?.status) {
    query += ' AND status = ?';
    params.push(filter.status);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as unknown as RelocationRequestRow[];
  return rows.map(mapRelocationRow);
}

export function reviewRelocationRequest(
  db: DatabaseSync,
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewedBy: string,
  rejectionReason?: string
): RelocationRequest | null {
  const existing = getRelocationRequestById(db, id);
  if (!existing) return null;

  const reviewedAt = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE relocation_requests
    SET status = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = ?
    WHERE id = ?
  `);
  stmt.run(
    status,
    reviewedBy,
    reviewedAt,
    status === 'REJECTED' ? (rejectionReason || null) : null,
    id
  );

  // On approval, atomically update intern's assigned office location
  if (status === 'APPROVED') {
    updateInternLocation(db, existing.internId, existing.targetLocationId);
  }

  return getRelocationRequestById(db, id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: PASS (all 8 tests — 2 schema + 6 repository)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/relocation-repo.ts tests/relocation-api.test.ts
git commit -m "feat(backend): add relocation-repo.ts with CRUD and review operations"
```

---

### Task 3: REST API Routes (`POST` + `GET`)

**Files:**
- Create: `src/app/api/interns/relocation/route.ts`
- Modify: `tests/relocation-api.test.ts` (add API integration tests)

**Interfaces:**
- Consumes:
  - `createRelocationRequest`, `listRelocationRequests`, `getPendingRelocationForIntern` from `src/lib/db/relocation-repo.ts`
  - `getIntern` from `src/lib/db/repo.ts`
  - `getOfficeLocationById` from `src/lib/db/locations-repo.ts`
  - `enforceInternIdentity` from `src/lib/auth-guard.ts`
- Produces:
  - `POST /api/interns/relocation` → `201` with `{ message, request }` or `400/404/409` errors.
  - `GET /api/interns/relocation?internId=...&status=...` → `200` with `{ requests: RelocationRequest[] }`.

- [ ] **Step 1: Write failing tests for POST and GET routes**

Add to `tests/relocation-api.test.ts`:

```typescript
import {
  POST as postRelocation,
  GET as getRelocation,
} from '../src/app/api/interns/relocation/route.ts';

// Add inside the outer describe, after the repository tests:

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: FAIL — `Cannot find module '../src/app/api/interns/relocation/route.ts'`

- [ ] **Step 3: Implement `src/app/api/interns/relocation/route.ts`**

```typescript
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { getOfficeLocationById } from '../../../../lib/db/locations-repo.ts';
import {
  createRelocationRequest,
  listRelocationRequests,
  getPendingRelocationForIntern,
} from '../../../../lib/db/relocation-repo.ts';
import { enforceInternIdentity } from '../../../../lib/auth-guard.ts';
import type { RelocationRequest, RelocationStatus } from '../../../../types/index.ts';

interface RelocationPayload {
  internId: string;
  currentLocationId: string;
  targetLocationId: string;
  reason: string;
  notes?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RelocationPayload;

    if (!body.internId || !body.currentLocationId || !body.targetLocationId || !body.reason) {
      return Response.json(
        { error: 'Field internId, currentLocationId, targetLocationId, dan reason wajib diisi' },
        { status: 400 }
      );
    }

    if (body.reason.trim().length === 0) {
      return Response.json(
        { error: 'Alasan pindah kantor wajib diisi' },
        { status: 400 }
      );
    }

    if (body.currentLocationId === body.targetLocationId) {
      return Response.json(
        { error: 'Kantor tujuan tidak boleh sama dengan kantor saat ini' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Zero-impersonation guard
    const identityCheck = enforceInternIdentity(req, db, body.internId);
    if (!identityCheck.allowed && identityCheck.errorResponse) {
      return identityCheck.errorResponse;
    }

    // Verify intern exists
    const intern = getIntern(db, body.internId);
    if (!intern) {
      return Response.json(
        { error: `Peserta magang dengan ID '${body.internId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Verify target location exists
    const targetLocation = getOfficeLocationById(db, body.targetLocationId);
    if (!targetLocation) {
      return Response.json(
        { error: `Lokasi kantor tujuan dengan ID '${body.targetLocationId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Verify current location exists
    const currentLocation = getOfficeLocationById(db, body.currentLocationId);
    if (!currentLocation) {
      return Response.json(
        { error: `Lokasi kantor asal dengan ID '${body.currentLocationId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Check for existing pending request
    const existingPending = getPendingRelocationForIntern(db, body.internId);
    if (existingPending) {
      return Response.json(
        { error: 'Anda masih memiliki pengajuan pindah kantor yang sedang Menunggu Persetujuan' },
        { status: 409 }
      );
    }

    const newRequest: RelocationRequest = {
      id: `reloc-${randomUUID().slice(0, 8)}`,
      internId: body.internId,
      currentLocationId: body.currentLocationId,
      targetLocationId: body.targetLocationId,
      reason: body.reason.trim(),
      notes: body.notes?.trim() || null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    createRelocationRequest(db, newRequest);

    return Response.json(
      { message: 'Pengajuan pindah kantor berhasil dikirim', request: newRequest },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const internId = searchParams.get('internId') || undefined;
    const status = (searchParams.get('status') as RelocationStatus) || undefined;

    const db = getDatabase();
    const requests = listRelocationRequests(db, { internId, status });

    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: PASS (all 16 tests — 2 schema + 6 repo + 8 API)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/interns/relocation/route.ts tests/relocation-api.test.ts
git commit -m "feat(backend): add POST and GET /api/interns/relocation routes"
```

---

### Task 4: REST API Route — `PATCH /api/interns/relocation/[id]` (Review Endpoint)

**Files:**
- Create: `src/app/api/interns/relocation/[id]/route.ts`
- Modify: `tests/relocation-api.test.ts` (add PATCH integration tests)

**Interfaces:**
- Consumes:
  - `getRelocationRequestById`, `reviewRelocationRequest` from `src/lib/db/relocation-repo.ts`
  - `checkRoleIfAuthenticated` from `src/lib/auth-guard.ts`
- Produces:
  - `PATCH /api/interns/relocation/:id` → `200` with `{ message, request }` or `400/404` errors.

- [ ] **Step 1: Write failing tests for PATCH route**

Add to `tests/relocation-api.test.ts`:

```typescript
import {
  PATCH as patchRelocation,
} from '../src/app/api/interns/relocation/[id]/route.ts';

// Add inside the outer describe:

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: FAIL — `Cannot find module '../src/app/api/interns/relocation/[id]/route.ts'`

- [ ] **Step 3: Implement `src/app/api/interns/relocation/[id]/route.ts`**

```typescript
import { getDatabase } from '../../../../../lib/db/client.ts';
import {
  getRelocationRequestById,
  reviewRelocationRequest,
} from '../../../../../lib/db/relocation-repo.ts';
import { checkRoleIfAuthenticated } from '../../../../../lib/auth-guard.ts';
import type { RelocationStatus } from '../../../../../types/index.ts';

const VALID_REVIEW_STATUSES: RelocationStatus[] = ['APPROVED', 'REJECTED'];

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, reviewedBy, rejectionReason } = body;

    if (!status || !VALID_REVIEW_STATUSES.includes(status)) {
      return Response.json(
        { error: `Status tidak valid. Pilihan: ${VALID_REVIEW_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Enforce administrative role if authenticated
    const roleCheck = checkRoleIfAuthenticated(req, db, ['ADMIN', 'SUPERVISOR']);
    if (!roleCheck.allowed && roleCheck.errorResponse) {
      return roleCheck.errorResponse;
    }

    const existing = getRelocationRequestById(db, id);
    if (!existing) {
      return Response.json(
        { error: `Pengajuan pindah kantor dengan ID '${id}' tidak ditemukan` },
        { status: 404 }
      );
    }

    const updated = reviewRelocationRequest(
      db,
      id,
      status,
      reviewedBy || 'System',
      status === 'REJECTED' ? rejectionReason : undefined
    );

    return Response.json(
      {
        message: `Pengajuan pindah kantor berhasil di-${status.toLowerCase()}`,
        request: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/relocation-api.test.ts`
Expected: PASS (all 20 tests — 2 schema + 6 repo + 8 POST/GET + 4 PATCH)

- [ ] **Step 5: Run full test suite to verify zero regressions**

Run: `npm test`
Expected: All 149 existing tests + 20 new tests = 169 total, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/interns/relocation/\[id\]/route.ts tests/relocation-api.test.ts
git commit -m "feat(backend): add PATCH /api/interns/relocation/[id] review endpoint with auth guard"
```

