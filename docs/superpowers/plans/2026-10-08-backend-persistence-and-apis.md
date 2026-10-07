# Implementation Plan: Backend Persistence & REST APIs (Phase 1)

**Date:** 2026-10-08  
**Target Branch:** `vicky` (`BACK-END SPECIALIST`)  
**Specification Reference:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)  
**Architecture Document:** [`docs/architecture-system-invariants.md`](../../architecture-system-invariants.md)  

---

## 1. Goal & Architecture Overview

Build the core backend persistence and REST API layer for the Indosat Attendance PWA system.
- **Runtime Persistence:** SQLite using Node.js v26 native `node:sqlite` (`DatabaseSync`), providing sub-millisecond in-memory testing and zero binary dependencies.
- **Data Model:** Tables for `office_config` (singleton), `interns` (master profiles), and `attendance_logs` (daily operational records with composite unique constraint `[intern_id, date]`).
- **Server Geofencing & Tamper Prevention:** Server-side Haversine calculation (`src/lib/geo.ts`) enforces location boundaries regardless of client input.
- **API Surface:**
  - `POST /api/attendance/check-in`: Validates GPS location against `office_config`, calculates remarks, records check-in.
  - `POST /api/attendance/check-out`: Validates work end time, updates check-out timestamp and departure remarks.
  - `GET /api/attendance/status`: Returns current attendance state for a given `internId` and date.
  - `GET /api/interns` & `POST /api/interns`: Intern profile management.
  - `GET /api/config` & `PUT /api/config`: Office location and working schedule configuration.

---

## 2. Branch Scoping & Role Isolation

- **Active Track:** `[BACKEND / branch: vicky]`
- **Frontend Track (`zacky`):** Decoupled. Zacky can work concurrently on PWA manifest and mobile UI using the shared types in [`src/types/index.ts`](../../src/types/index.ts).
- **Hard Guardrails:**
  - Do NOT modify any UI components, CSS styling, or PWA service worker configs.
  - Do NOT commit `*.db` binary files or WhatsApp auth sessions.

---

## 3. Global Invariants & Constraints

1. **SSOT Rule:** All interfaces (`OfficeConfig`, `InternProfile`, `AttendanceRecord`, `Coordinates`) MUST import directly from `src/types/index.ts`. No duplicate inline interfaces.
2. **File Size Limit:** No handler or repository file may exceed 250 lines.
3. **Execution Latency:** All tests must run via `npm run test:fast <path>` in `<300ms`.
4. **Mandatory 3-Step Execution Loop:**
   - Step 1: Write the failing test.
   - Step 2: Implement minimum passing code.
   - Step 3: Run verification command and paste terminal proof.

---

## 4. File Structure Diff

```text
Create:
- src/lib/db/client.ts       (SQLite DatabaseSync factory supporting file and in-memory DB)
- src/lib/db/schema.ts       (DDL table definitions & migration runner)
- src/lib/db/repo.ts         (Typed database operations for config, interns, and attendance)
- src/lib/db/seed.ts         (Seed script for default office coordinates and mock interns)
- src/app/api/config/route.ts
- src/app/api/interns/route.ts
- src/app/api/attendance/check-in/route.ts
- src/app/api/attendance/check-out/route.ts
- src/app/api/attendance/status/route.ts

Test:
- tests/db.test.ts           (Unit tests for SQLite schema, repository, and constraints)
- tests/api.test.ts          (Integration tests for check-in, check-out, and status endpoints)
```

---

## 5. Granular Tasks (Strictly Divided by Track)

### Track A: [BACKEND / branch: vicky]

- [x] **Task A1: SQLite Database Engine & Repository Layer**
  - **Step 1: Write the failing test** (`tests/db.test.ts`)
    - Verify schema initialization on in-memory SQLite database.
    - Test `office_config` singleton creation and retrieval.
    - Test `interns` CRUD operations.
    - Test `attendance_logs` check-in creation and duplicate prevention for same intern on same date.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/db/client.ts` using `node:sqlite`.
    - Create `src/lib/db/schema.ts` with SQL DDL.
    - Create `src/lib/db/repo.ts` with typed methods.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/db.test.ts`
    - Verify 0 failures in < 150ms. (Result: 9/9 passing in 24ms)

- [x] **Task A2: Database Seeder Script**
  - **Step 1: Write the failing test** (verify seed data can be loaded idempotently into database)
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/db/seed.ts` inserting default office config (Indosat HQ lat/lng, 50m radius) and sample interns.
  - **Step 3: Run verification command**
    - Run seed function test and verify records present. (Result: 1/1 passing in 4ms, CLI npm run db:seed verified)

- [x] **Task A3: Config & Intern REST APIs**
  - **Step 1: Write the failing test** (`tests/api-master.test.ts`)
    - Test `GET /api/config` and `PUT /api/config`.
    - Test `GET /api/interns` and `POST /api/interns`.
  - **Step 2: Implement minimum passing code**
    - Implement `src/app/api/config/route.ts`.
    - Implement `src/app/api/interns/route.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/api-master.test.ts` (Result: 5/5 passing in 47ms)

- [ ] **Task A4: Attendance Check-In API with Server-Side Geofencing**
  - **Step 1: Write the failing test** (`tests/api-checkin.test.ts`)
    - Rejects request when coordinates are outside office radius (>50m) with 403 Forbidden.
    - Accepts valid coordinates (<=50m), evaluates punctuality remarks, and returns 201 Created.
    - Rejects duplicate check-in on the same date with 409 Conflict.
  - **Step 2: Implement minimum passing code**
    - Implement `src/app/api/attendance/check-in/route.ts` integrating `src/lib/geo.ts` and `src/lib/db/repo.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/api-checkin.test.ts`

- [ ] **Task A5: Attendance Check-Out & Status APIs**
  - **Step 1: Write the failing test** (`tests/api-checkout.test.ts`)
    - Test `POST /api/attendance/check-out` updating existing check-in with exit timestamp and remarks.
    - Test check-out rejection if check-in has not occurred yet.
    - Test `GET /api/attendance/status` returning current intern status for today.
  - **Step 2: Implement minimum passing code**
    - Implement `src/app/api/attendance/check-out/route.ts`.
    - Implement `src/app/api/attendance/status/route.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/api-checkout.test.ts`

- [ ] **Task A6: Full Backend Test Suite Verification**
  - **Step 1: Run complete test suite**
    - `npm test`
  - **Step 2: Verify zero regressions and check latency target (<500ms total)**
  - **Step 3: Paste terminal output proof into summary artifact**

---

### Track B: [FRONTEND / branch: zacky] (Reference Only — Out of Scope for Vicky)

- [ ] **Task B1: Mobile Shell & Viewport Cascade** (`branch: zacky`)
- [ ] **Task B2: High-Accuracy Client Geolocation & Radar UI** (`branch: zacky`)
- [ ] **Task B3: Check-In / Check-Out Interactive Buttons & Feedback** (`branch: zacky`)
- [ ] **Task B4: PWA Web App Manifest & Service Worker** (`branch: zacky`)
