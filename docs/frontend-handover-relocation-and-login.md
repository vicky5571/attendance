# Frontend Handover: Office Relocation Persistence & Flexible Login Form

**Date:** 2026-10-14  
**Target Branch:** `zacky` (`FRONT-END SPECIALIST`)  
**Backend Baseline:** Branch `vicky` (Commit `1cef4ca`, 173/173 passing tests)  
**Implementation Plan Reference:** [`docs/superpowers/plans/2026-10-14-relocation-api-persistence.md`](superpowers/plans/2026-10-14-relocation-api-persistence.md)

---

## 1. Executive Summary

The backend team has deployed two major initiatives to branch `vicky` ready for frontend integration:

1. **Office Relocation Request API & SQLite Persistence (`/api/interns/relocation`)**:
   - Replaces the temporary client-side `localStorage` mock in [`src/lib/services/relocation-service.ts`](file:///Users/mac/Web%20Development/indosat/attendance/src/lib/services/relocation-service.ts).
   - Full persistence in SQLite table `relocation_requests`.
   - On approval (`PATCH /api/interns/relocation/[id]`), the intern's assigned office (`interns.assigned_location_id`) is atomically updated on the server.

2. **Username / Email & Password Login API Support (`/api/auth/login`)**:
   - `POST /api/auth/login` now accepts **Username, Intern ID, or Email** interchangeably (`identifier`, `email`, or `username`) alongside `password`.
   - Admin can log in using `admin` or `admin@ioh.co.id`.
   - Interns can log in using `intern-sarah` or `sarah@ioh.co.id` with password `InternIOH2026!`.

---

## 2. Active Backend Endpoints & API Contracts

### 2.1 Office Relocation APIs

#### A. Submit Relocation Request
* **Endpoint:** `POST /api/interns/relocation`
* **Headers:** `Content-Type: application/json`, Cookie: `ioh_session` (optional if unauthenticated test)
* **Request Body:**
  ```json
  {
    "internId": "intern-sarah",
    "currentLocationId": "loc-kppti",
    "targetLocationId": "loc-bsd",
    "reason": "Pindah domisili ke Tangerang Selatan",
    "notes": "Sudah koordinasi dengan mentor"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Pengajuan pindah kantor berhasil dikirim",
    "request": {
      "id": "reloc-a1b2c3d4",
      "internId": "intern-sarah",
      "currentLocationId": "loc-kppti",
      "targetLocationId": "loc-bsd",
      "reason": "Pindah domisili ke Tangerang Selatan",
      "notes": "Sudah koordinasi dengan mentor",
      "status": "PENDING",
      "createdAt": "2026-10-14T15:30:00.000Z"
    }
  }
  ```
* **Error Responses:**
  * `400 Bad Request`: Missing fields, empty reason, or `targetLocationId === currentLocationId`.
  * `404 Not Found`: Intern or office location ID does not exist.
  * `409 Conflict`: Intern already has a `PENDING` relocation request awaiting review.

#### B. List Relocation Requests
* **Endpoint:** `GET /api/interns/relocation?internId=...&status=...`
* **Query Parameters:**
  * `internId` *(optional)*: Filter by intern ID.
  * `status` *(optional)*: `PENDING` | `APPROVED` | `REJECTED`.
* **Success Response (`200 OK`):**
  ```json
  {
    "requests": [
      {
        "id": "reloc-a1b2c3d4",
        "internId": "intern-sarah",
        "currentLocationId": "loc-kppti",
        "targetLocationId": "loc-bsd",
        "reason": "Pindah domisili ke Tangerang Selatan",
        "notes": "Sudah koordinasi dengan mentor",
        "status": "PENDING",
        "createdAt": "2026-10-14T15:30:00.000Z"
      }
    ]
  }
  ```

#### C. Review Relocation Request (Approve / Reject)
* **Endpoint:** `PATCH /api/interns/relocation/[id]`
* **Headers:** `Content-Type: application/json`
* **Role Requirement:** Requires `ADMIN` or `SUPERVISOR` session (or unauthenticated dev bypass).
* **Request Body (Approve):**
  ```json
  {
    "status": "APPROVED",
    "reviewedBy": "Administrator IOH"
  }
  ```
* **Request Body (Reject):**
  ```json
  {
    "status": "REJECTED",
    "reviewedBy": "Administrator IOH",
    "rejectionReason": "Kebutuhan tim operasional masih terpusat di kantor KPPTI"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Pengajuan pindah kantor berhasil di-approved",
    "request": {
      "id": "reloc-a1b2c3d4",
      "status": "APPROVED",
      "reviewedBy": "Administrator IOH",
      "reviewedAt": "2026-10-14T15:45:00.000Z"
    }
  }
  ```

---

### 2.2 Flexible Login API (`POST /api/auth/login`)

The backend now parses `identifier`, `email`, or `username` interchangeably:

* **Request Body (Username + Password):**
  ```json
  {
    "username": "admin",
    "password": "AdminIOH2026!"
  }
  ```
* **Request Body (Intern ID + Password):**
  ```json
  {
    "email": "intern-sarah",
    "password": "InternIOH2026!"
  }
  ```
* **Request Body (Standard Email + Password):**
  ```json
  {
    "email": "sarah@ioh.co.id",
    "password": "InternIOH2026!"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "message": "Login berhasil",
    "user": {
      "id": "intern-sarah",
      "name": "Sarah Nurhaliza",
      "email": "sarah@ioh.co.id",
      "role": "INTERN",
      "divisi": "Network Operations"
    }
  }
  ```

---

## 3. Pre-Seeded Development Credentials

| Role | Username / ID | Corporate Email | Password | PIN (Punch) |
| :--- | :--- | :--- | :--- | :--- |
| **Intern** | `intern-sarah` | `sarah@ioh.co.id` | `InternIOH2026!` | `123456` |
| **Intern** | `intern-zacky` | `zacky@ioh.co.id` | `InternIOH2026!` | `123456` |
| **Admin** | `admin` | `admin@ioh.co.id` | `AdminIOH2026!` | N/A |

---

## 4. Frontend Jobdesk Checklist (`branch: zacky`)

### 📋 Task F1: Connect `relocation-service.ts` to Backend APIs
* **Target File:** [`src/lib/services/relocation-service.ts`](file:///Users/mac/Web%20Development/indosat/attendance/src/lib/services/relocation-service.ts)
* **Actions:**
  - [ ] In `getRelocationRequests(internId)`:
    - Replace the pure localStorage read with a `fetch(`/api/interns/relocation${internId ? `?internId=${internId}` : ''}`)`.
    - If fetch fails or is offline, fallback to cached data in `localStorage`.
  - [ ] In `submitRelocationRequest(payload)`:
    - Perform client validation (target ≠ current, reason non-empty).
    - Send `POST /api/interns/relocation` with `{ internId, currentLocationId, targetLocationId, reason, notes }`.
    - Handle `409 Conflict` (alerting user that an active request is already pending).
    - Cache successful request in `localStorage` for instant UI reactivity.
  - [ ] In `reviewRelocationRequest(id, status, reviewedBy, rejectionReason)`:
    - Send `PATCH /api/interns/relocation/${id}` with `{ status, reviewedBy, rejectionReason }`.
    - When `status === 'APPROVED'`, update the local active office cache (`ioh_user_office_${internId}`).

### 📋 Task F2: Update Admin Verification / Approval UI
* **Target File:** [`src/components/admin/VerificationManager.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/admin/VerificationManager.tsx) & [`src/app/admin/page.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/app/admin/page.tsx)
* **Actions:**
  - [ ] Verify that approving/rejecting relocation requests calls the updated `reviewRelocationRequest()`.
  - [ ] Ensure toast feedback displays backend confirmation or server error message.

### 📋 Task F3: Login Form Input Upgrades
* **Target Files:**
  - [`src/lib/client-auth.ts`](file:///Users/mac/Web%20Development/indosat/attendance/src/lib/client-auth.ts)
  - [`src/components/auth/AdminLoginForm.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/auth/AdminLoginForm.tsx)
  - [`src/components/auth/UnifiedLoginForm.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/auth/UnifiedLoginForm.tsx)
  - [`src/app/login/page.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/app/login/page.tsx)
* **Actions:**
  - [ ] In `client-auth.ts`: Update `loginWithCredentials(identifier: string, password: string)` to send `{ identifier, password }`.
  - [ ] In `AdminLoginForm.tsx`: Change label and placeholder from `"Email Admin / Mentor"` to `"Username atau Email"`, allowing both `admin` and `admin@ioh.co.id`.
  - [ ] In `login/page.tsx`:
    - Add an alternative action link or toggle on the "Peserta Magang" tab (e.g. *"Masuk dengan Username/Password"*), OR switch to [`UnifiedLoginForm.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/auth/UnifiedLoginForm.tsx) so interns who don't want to use PIN can type their username/email & password directly.

---

## 5. Verification Commands for Frontend Team

```bash
# 1. Switch to frontend branch
git checkout zacky   # or git checkout feat/frontend-*

# 2. Pull backend changes from vicky or merge
git merge vicky

# 3. Verify TypeScript build integrity
npm run build

# 4. Verify fast test harness (<1s)
npm test
```

