# Selfie Verification for Check-In/Check-Out & Profile Photo Restoration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement backend support for selfie verification during check-in and check-out, with photo upload validation, disk storage, database persistence in `attendance_logs`, and automatic syncing/restoration of the latest verified selfie onto the intern's profile (`interns.photo_url`).

**Architecture:**
- **Schema & Persistence**: Add `photo_url` column to `interns` table and `check_out_photo_url` column to `attendance_logs` table via SQLite DDL migrations in `src/lib/db/schema.ts`.
- **Upload Pipeline**: Create `POST /api/attendance/upload-photo` handling Base64/data-URI payloads, validating MIME types (`image/jpeg`, `image/png`, `image/webp`) and file size limits (max 3MB), and storing optimized images in `/public/uploads/selfies/`.
- **Atomic Profile Restoration**: When an intern checks in or checks out with a selfie URL, `recordCheckIn` and `recordCheckOut` save the photo to the attendance record AND automatically update `interns.photo_url`.
- **Session Hydration**: `GET /api/auth/me` and `GET /api/interns` return `photoUrl`, enabling the frontend (`ProfileCard` and `ProfilePage`) to display the latest verified selfie immediately.

**Tech Stack:** Node.js v26.8.1 (ESM), Next.js 16.4.0 (App Router), SQLite (`node:sqlite` DatabaseSync), Node.js Native Test Runner (`node:test`), Node `node:fs/promises` and `node:crypto`.

**Spec:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)

---

## Global Constraints

- Branch: `vicky` (`BACK-END SPECIALIST`). Only backend APIs, schemas, repository helpers, and tests.
- All domain types imported from `src/types/index.ts` (SSOT).
- Image uploads stored under `public/uploads/selfies/` with sanitized, collision-resistant filenames.
- Test harness: `npm run test:fast <path>` — under 500ms execution latency.
- Backward compatibility: Existing tests and database records without photos must continue to pass seamlessly.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `photoUrl` to `InternProfile` and `checkOutPhotoUrl` to `AttendanceRecord` |
| Modify | `src/lib/db/schema.ts` | Add DDL columns & backward-compatible migrations for `interns.photo_url` & `attendance_logs.check_out_photo_url` |
| Modify | `src/lib/db/repo.ts` | Add `updateInternPhoto`, update `mapInternRow`, `mapAttendanceRow`, `recordCheckIn`, and `recordCheckOut` |
| Create | `src/app/api/attendance/upload-photo/route.ts` | `POST /api/attendance/upload-photo` (Base64 validation, size limits, disk writer) |
| Modify | `src/app/api/attendance/check-in/route.ts` | Accept `photoUrl`, record in logs, and auto-sync to `interns.photo_url` |
| Modify | `src/app/api/attendance/check-out/route.ts` | Accept `photoUrl` / `checkOutPhotoUrl`, record in logs, and auto-sync to `interns.photo_url` |
| Modify | `src/app/api/auth/me/route.ts` | Return `photoUrl` in authenticated session user profile |
| Create | `tests/selfie-verification.test.ts` | Comprehensive test suite for photo upload, check-in/out selfie verification, and profile restoration |

---

### Task 1: Domain Types & Schema Migrations

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/db/schema.ts`
- Test: `tests/selfie-verification.test.ts` (new file)

**Interfaces:**
- `InternProfile`: adds `photoUrl?: string;`
- `AttendanceRecord`: adds `checkOutPhotoUrl?: string;`
- SQLite tables:
  - `interns`: `photo_url TEXT`
  - `attendance_logs`: `check_out_photo_url TEXT`

- [ ] **Step 1: Write failing schema tests in `tests/selfie-verification.test.ts`**

Create `tests/selfie-verification.test.ts`:

```typescript
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
```

- [x] **Step 1: Write failing schema tests in `tests/selfie-verification.test.ts`**

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: FAIL — column `check_out_photo_url` or `photo_url` does not exist.

- [x] **Step 3: Update `src/types/index.ts`**

In `src/types/index.ts`:
1. In `interface InternProfile`, add `photoUrl?: string;`
2. In `interface AttendanceRecord`, add `checkOutPhotoUrl?: string;`

- [x] **Step 4: Update `src/lib/db/schema.ts`**

In `src/lib/db/schema.ts`:
1. In `SCHEMA_SQL`, add `photo_url TEXT` to `interns` table definition.
2. In `SCHEMA_SQL`, add `check_out_photo_url TEXT` to `attendance_logs` table definition.
3. In `initSchema(db: DatabaseSync)` function, add backward-compatible `ALTER TABLE` blocks:
```typescript
  try {
    db.exec('ALTER TABLE interns ADD COLUMN photo_url TEXT;');
  } catch {
    // Column already exists
  }

  try {
    db.exec('ALTER TABLE attendance_logs ADD COLUMN check_out_photo_url TEXT;');
  } catch {
    // Column already exists
  }
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: PASS (2 tests)

- [x] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/db/schema.ts tests/selfie-verification.test.ts
git commit -m "feat(backend): add photo_url to interns and check_out_photo_url to attendance_logs schema"
```

---

### Task 2: Repository Operations & Auto-Sync to Profile

**Files:**
- Modify: `src/lib/db/repo.ts`
- Modify: `tests/selfie-verification.test.ts`

**Interfaces:**
- Produces:
  - `updateInternPhoto(db: DatabaseSync, internId: string, photoUrl: string): void`
  - `mapInternRow` mapping `photo_url` -> `photoUrl`
  - `mapAttendanceRow` mapping `check_out_photo_url` -> `checkOutPhotoUrl`
  - `recordCheckOut` accepting `checkOutPhotoUrl?: string` and returning updated record.

- [ ] **Step 1: Write failing repository tests in `tests/selfie-verification.test.ts`**

Add to `tests/selfie-verification.test.ts`:

```typescript
import {
  createIntern,
  getIntern,
  updateInternPhoto,
  recordCheckIn,
  recordCheckOut,
  getAttendanceRecord,
} from '../src/lib/db/repo.ts';
import type { InternProfile, AttendanceRecord } from '../src/types/index.ts';

// Add inside the outer describe:
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
```

- [x] **Step 1: Write failing repository tests in `tests/selfie-verification.test.ts`**

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: FAIL — `updateInternPhoto` is not a function / `checkOutPhotoUrl` not persisted.

- [x] **Step 3: Implement updates in `src/lib/db/repo.ts`**

In `src/lib/db/repo.ts`:
1. In `interface InternRow`, add `photo_url?: string | null;`
2. In `interface AttendanceRow`, add `check_out_photo_url?: string | null;`
3. In `mapInternRow`:
```typescript
  if (row.photo_url) profile.photoUrl = row.photo_url;
```
4. In `mapAttendanceRow`:
```typescript
  if (row.check_out_photo_url) record.checkOutPhotoUrl = row.check_out_photo_url;
```
5. In `createIntern`: insert `intern.photoUrl || null` into `photo_url` column.
6. Add function `updateInternPhoto`:
```typescript
export function updateInternPhoto(
  db: DatabaseSync,
  internId: string,
  photoUrl: string
): void {
  const stmt = db.prepare('UPDATE interns SET photo_url = ? WHERE id = ?');
  stmt.run(photoUrl, internId);
}
```
7. In `recordCheckIn`:
If `record.photoUrl` is provided, call `updateInternPhoto(db, record.internId, record.photoUrl)` right after inserting.
8. In `recordCheckOut`:
Update signature to accept `checkOutPhotoUrl?: string`:
```typescript
export function recordCheckOut(
  db: DatabaseSync,
  internId: string,
  date: string,
  data: {
    checkOutTime: string;
    checkOutCoords?: Coordinates;
    remarks?: string;
    checkOutPhotoUrl?: string;
  }
): AttendanceRecord
```
Update SQL query to `SET check_out_time = ?, check_out_lat = ?, check_out_lng = ?, remarks = ?, check_out_photo_url = coalesce(?, check_out_photo_url)` and run with `data.checkOutPhotoUrl || null`.
If `data.checkOutPhotoUrl` is provided, call `updateInternPhoto(db, internId, data.checkOutPhotoUrl)`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: PASS (6 tests)

- [x] **Step 5: Commit**

```bash
git add src/lib/db/repo.ts tests/selfie-verification.test.ts
git commit -m "feat(backend): add updateInternPhoto and auto-sync check-in/out selfies to intern profile"
```

---

### Task 3: Photo Upload REST API (`POST /api/attendance/upload-photo`)

**Files:**
- Create: `src/app/api/attendance/upload-photo/route.ts`
- Modify: `tests/selfie-verification.test.ts`

**Interfaces:**
- Consumes: `enforceInternIdentity` from `src/lib/auth-guard.ts`, `node:fs/promises`, `node:crypto`.
- Produces: `POST /api/attendance/upload-photo`
  - Accepts JSON: `{ internId: string, image: string, type?: 'CHECK_IN' | 'CHECK_OUT' | 'PROFILE' }`
    (where `image` is Base64 data URL: `data:image/jpeg;base64,...` or raw Base64 string).
  - Validates:
    - `internId` and `image` are present.
    - Supported MIME: `image/jpeg`, `image/png`, `image/webp`.
    - Max size: 3MB payload limit.
  - Writes to disk: `public/uploads/selfies/<internId>-<timestamp>-<uuid>.jpg`.
  - Returns `201 Created`:
    ```json
    {
      "message": "Foto selfie berhasil diunggah",
      "photoUrl": "/uploads/selfies/intern-sarah-1728938400000-a1b2c3d4.jpg",
      "size": 142000,
      "mimeType": "image/jpeg"
    }
    ```

- [x] **Step 1: Write failing upload tests in `tests/selfie-verification.test.ts`**

Add to `tests/selfie-verification.test.ts`:

```typescript
import { POST as uploadPhotoRoute } from '../src/app/api/attendance/upload-photo/route.ts';

// Add inside the outer describe:
  describe('POST /api/attendance/upload-photo', () => {
    // 1x1 pixel transparent PNG Base64 data URI
    const VALID_BASE64_IMAGE =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should accept valid base64 image and return 201 with public photoUrl', async () => {
      const req = new Request('http://localhost:3000/api/attendance/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-selfie-repo',
          image: VALID_BASE64_IMAGE,
          type: 'CHECK_IN',
        }),
      });

      const res = await uploadPhotoRoute(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.photoUrl);
      assert.match(data.photoUrl, /^\/uploads\/selfies\/intern-selfie-repo-.*\.png$/);
      assert.equal(data.mimeType, 'image/png');
    });

    it('should reject payload missing internId or image with 400', async () => {
      const req = new Request('http://localhost:3000/api/attendance/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: 'intern-selfie-repo' }),
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
          internId: 'intern-selfie-repo',
          image: 'data:application/pdf;base64,JVBERi0xLjQK...',
        }),
      });

      const res = await uploadPhotoRoute(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Format gambar tidak didukung/i);
    });
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: FAIL — `Cannot find module '../src/app/api/attendance/upload-photo/route.ts'`

- [x] **Step 3: Implement `src/app/api/attendance/upload-photo/route.ts`**

Create `src/app/api/attendance/upload-photo/route.ts`:

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { enforceInternIdentity } from '../../../../lib/auth-guard.ts';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB limit
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.internId || !body.image) {
      return Response.json(
        { error: 'Field internId dan image wajib diisi' },
        { status: 400 }
      );
    }

    const { internId, image } = body;
    const db = getDatabase();

    // Zero-impersonation guard
    const identityCheck = enforceInternIdentity(req, db, internId);
    if (!identityCheck.allowed && identityCheck.errorResponse) {
      return identityCheck.errorResponse;
    }

    // Verify intern exists
    const intern = getIntern(db, internId);
    if (!intern) {
      return Response.json(
        { error: `Peserta magang dengan ID '${internId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Parse Data URI or raw base64
    let mimeType = 'image/jpeg';
    let base64Data = image;

    const dataUriMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1].toLowerCase();
      base64Data = dataUriMatch[2];
    }

    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) {
      return Response.json(
        {
          error: `Format gambar tidak didukung (${mimeType}). Format yang didukung: JPEG, PNG, WEBP`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return Response.json({ error: 'Data gambar kosong atau tidak valid' }, { status: 400 });
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      return Response.json(
        {
          error: `Ukuran foto melebihi batas maksimal 3MB (ukuran saat ini: ${(
            buffer.length /
            (1024 * 1024)
          ).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    // Prepare upload directory: public/uploads/selfies
    const targetDir = join(process.cwd(), 'public', 'uploads', 'selfies');
    await mkdir(targetDir, { recursive: true });

    // Generate collision-resistant filename
    const sanitizedId = internId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${sanitizedId}-${Date.now()}-${randomBytes(4).toString('hex')}${extension}`;
    const filePath = join(targetDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/selfies/${filename}`;

    return Response.json(
      {
        message: 'Foto selfie berhasil diunggah',
        photoUrl: publicUrl,
        size: buffer.length,
        mimeType,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: PASS (9 tests)

- [x] **Step 5: Commit**

```bash
git add src/app/api/attendance/upload-photo/route.ts tests/selfie-verification.test.ts
git commit -m "feat(backend): add POST /api/attendance/upload-photo with size and MIME validation"
```

---

### Task 4: Check-In/Check-Out APIs Integration with Auto-Restoration

**Files:**
- Modify: `src/app/api/attendance/check-in/route.ts`
- Modify: `src/app/api/attendance/check-out/route.ts`
- Modify: `src/app/api/auth/me/route.ts`
- Modify: `tests/selfie-verification.test.ts`

**Interfaces:**
- Check-In endpoint: Accepts `photoUrl?: string`. When provided, updates `attendance_logs.photo_url` and `interns.photo_url`.
- Check-Out endpoint: Accepts `photoUrl?: string` or `checkOutPhotoUrl?: string`. When provided, updates `attendance_logs.check_out_photo_url` and `interns.photo_url`.
- Session profile endpoint (`GET /api/auth/me`): Returns `photoUrl` in the user profile payload.

- [x] **Step 1: Write integration tests in `tests/selfie-verification.test.ts`**

Add to `tests/selfie-verification.test.ts`:

```typescript
import { POST as checkInRoute } from '../src/app/api/attendance/check-in/route.ts';
import { POST as checkOutRoute } from '../src/app/api/attendance/check-out/route.ts';
import { GET as meRoute } from '../src/app/api/auth/me/route.ts';
import { setOfficeConfig } from '../src/lib/db/repo.ts';
import { createSession } from '../src/lib/db/auth-repo.ts';

// Add inside the outer describe:
  describe('Full Flow: Check-In & Check-Out Selfie Auto-Restoring to Profile', () => {
    beforeEach(() => {
      setOfficeConfig(db, {
        targetLatitude: -6.180495,
        targetLongitude: 106.822769,
        maxRadiusMeters: 100,
        workStartTime: '08:30',
        workEndTime: '17:30',
        emailAtasan: 'supervisor@indosat.com',
      });

      createIntern(db, {
        id: 'intern-flow-test',
        namaLengkap: 'Flow Test Intern',
        divisi: 'Network Operations',
        namaMentor: 'Mentor',
        emailMentor: 'mentor@indosat.com',
        universitas: 'UI',
        jurusan: 'EE',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      });
    });

    it('should record check-in selfie and auto-restore it to intern profile', async () => {
      const checkInReq = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-flow-test',
          latitude: -6.180495,
          longitude: 106.822769,
          photoUrl: '/uploads/selfies/checkin-morning.jpg',
        }),
      });

      const checkInRes = await checkInRoute(checkInReq);
      assert.equal(checkInRes.status, 201);
      const data = await checkInRes.json();
      assert.equal(data.photoUrl, '/uploads/selfies/checkin-morning.jpg');

      // Verify intern profile has been updated
      const intern = getIntern(db, 'intern-flow-test');
      assert.equal(intern?.photoUrl, '/uploads/selfies/checkin-morning.jpg');
    });

    it('should record check-out selfie and auto-restore latest photo to intern profile', async () => {
      // 1. Check in first
      await checkInRoute(
        new Request('http://localhost:3000/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            internId: 'intern-flow-test',
            latitude: -6.180495,
            longitude: 106.822769,
            photoUrl: '/uploads/selfies/checkin-morning.jpg',
          }),
        })
      );

      // 2. Check out with new selfie
      const checkOutReq = new Request('http://localhost:3000/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-flow-test',
          latitude: -6.180495,
          longitude: 106.822769,
          photoUrl: '/uploads/selfies/checkout-evening.jpg',
        }),
      });

      const checkOutRes = await checkOutRoute(checkOutReq);
      assert.equal(checkOutRes.status, 200);
      const data = await checkOutRes.json();
      assert.equal(data.checkOutPhotoUrl, '/uploads/selfies/checkout-evening.jpg');

      // Verify intern profile now displays the latest check-out selfie
      const intern = getIntern(db, 'intern-flow-test');
      assert.equal(intern?.photoUrl, '/uploads/selfies/checkout-evening.jpg');
    });

    it('should hydrate photoUrl in GET /api/auth/me session', async () => {
      updateInternPhoto(db, 'intern-flow-test', '/uploads/selfies/profile-hydrated.jpg');

      createSession(db, {
        id: 'sess-photo-test',
        userId: 'intern-flow-test',
        role: 'INTERN',
        token: 'token-photo-test-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const meReq = new Request('http://localhost:3000/api/auth/me', {
        headers: { cookie: 'ioh_session=token-photo-test-123' },
      });

      const meRes = await meRoute(meReq);
      assert.equal(meRes.status, 200);
      const data = await meRes.json();
      assert.equal(data.user.photoUrl, '/uploads/selfies/profile-hydrated.jpg');
    });
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: FAIL — `checkOutPhotoUrl` undefined / `photoUrl` not in `/api/auth/me`.

- [x] **Step 3: Update `src/app/api/attendance/check-out/route.ts`**

In `src/app/api/attendance/check-out/route.ts`:
1. In `interface CheckOutPayload`, add:
```typescript
  photoUrl?: string;
  checkOutPhotoUrl?: string;
```
2. When calling `recordCheckOut`:
```typescript
    const updated = recordCheckOut(db, body.internId, dateStr, {
      checkOutTime: timeStr,
      checkOutCoords: coords,
      remarks: combinedRemarks,
      checkOutPhotoUrl: body.checkOutPhotoUrl || body.photoUrl,
    });
```

- [x] **Step 4: Update `src/app/api/auth/me/route.ts`**

In `src/app/api/auth/me/route.ts`:
In intern session hydration block, add `photoUrl`:
```typescript
    if (session.role === 'INTERN') {
      const intern = getIntern(db, session.userId);
      return Response.json({
        user: {
          id: session.userId,
          name: intern?.namaLengkap || 'Peserta Magang',
          role: session.role,
          divisi: intern?.divisi,
          email: intern?.email,
          photoUrl: intern?.photoUrl,
          namaMentor: intern?.namaMentor,
          emailMentor: intern?.emailMentor,
        },
      });
    }
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: PASS (12 tests)

- [x] **Step 6: Commit**

```bash
git add src/app/api/attendance/check-out/route.ts src/app/api/auth/me/route.ts tests/selfie-verification.test.ts
git commit -m "feat(backend): support check-out selfie and auto-hydrate photoUrl in session profile"
```

---

### Task 5: Full Regression Testing & Verification

**Files:**
- Test: All suites across `tests/**/*.test.ts`

- [x] **Step 1: Run fast test harness on selfie verification suite**

Run: `npm run test:fast tests/selfie-verification.test.ts`
Expected: PASS (12 tests, 0 failures, under 500ms)

- [x] **Step 2: Run full project test suite**

Run: `npm test`
Expected: PASS (All 173+ tests pass, 0 failures)

- [x] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 type errors.

- [x] **Step 4: Commit documentation and implementation plan**

```bash
git add docs/superpowers/plans/2026-10-14-selfie-verification-and-profile-photo.md
git commit -m "docs(plan): add selfie verification and profile photo restoration implementation plan"
```

