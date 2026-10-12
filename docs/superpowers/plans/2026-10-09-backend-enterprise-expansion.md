# Implementation Plan: Backend Enterprise Expansion (Phase 3)

**Date:** 2026-10-09  
**Target Branch:** `vicky` (`BACK-END SPECIALIST`)  
**Specification Reference:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)  
**Architecture Invariants:** [`docs/architecture-system-invariants.md`](../../architecture-system-invariants.md)  

---

## 1. Goal & Architecture Overview

Elevate the Indosat Attendance PWA backend from a simple single-site punch clock prototype into a production-grade enterprise internship management system.

Key Subsystems:
1. **Leave & Remote Work Engine (`attendance_requests`):** Replace the binary presence/absence model with an official approval workflow for `WFH`, `SAKIT` (with doctor's note), `IZIN` (campus exam dispensation), and `OFF_SITE` duties.
2. **Anti-Proxy Authentication & PIN Security (`Anti-Jastip Absen`):** Eliminate dropdown impersonation by requiring intern PIN verification (salted SHA-256 hash) before check-in or checkout.
3. **Multi-Office Geofencing Hub (`office_locations`):** Support multi-site placement across IOH facilities (KPPTI Medan Merdeka Barat, Gedung Serpong BSD, regional circles) by evaluating coordinates against all active hubs.
4. **Timesheet & Monthly History Aggregator (`/api/attendance/history`):** Provide monthly logs, total working hours, punctuality metrics, and absence summaries required for university internship logbooks (LPJ Magang).
5. **Enhanced Daily Recap Dispatcher:** Integrate leave statuses (`WFH`, `SAKIT`, `IZIN`) into daily WhatsApp Baileys broadcasts and Nodemailer HTML summaries to eliminate false `ABSENT` flags.
6. **University Logbook Export Service (`/api/reports/monthly-export`):** Stream structured CSV/tabular monthly timesheets formatted for academic supervisors.

---

## 2. Branch Scoping & Role Isolation

- **Active Track:** `### Track A: [BACKEND / branch: vicky]`
  - All database schemas, migrations, seeders, repository methods, and API routes.
  - Multi-location geofence validator, timesheet calculation services, and export streamers.
- **Frontend Track (`zacky`):** `### Track B: [FRONTEND / branch: zacky]`
  - Delegated to branch `zacky`. Front-end will consume the typed endpoints for PIN entry, tabbed navigation, request forms, and timesheet views.
- **Hard Guardrails:**
  - **DO NOT** modify frontend React components, CSS stylesheets, or PWA service worker configurations.
  - Maintain 100% backward compatibility for all existing 62 unit and integration tests.
  - No new heavy dependencies: use Node.js standard libraries (`node:sqlite`, `node:crypto`) to maintain sub-second test execution.

---

## 3. Global Invariants & Constraints

1. **SSOT Rule:** All new domain interfaces (`AttendanceRequest`, `LeaveType`, `OfficeLocation`, `MonthlyTimesheetSummary`) MUST reside in [`src/types/index.ts`](../../src/types/index.ts). No duplicate inline interfaces.
2. **File Size Limit:** Every repository, service, and API route file must remain under 250 lines. Strangler pattern applied if files approach 250 lines.
3. **Execution Latency:** Individual unit/API test suites must complete in `<300ms` via `npm run test:fast <path>`.
4. **Strict 3-Step Execution Loop:**
   - `Step 1: Write the failing test`
   - `Step 2: Implement minimum passing code`
   - `Step 3: Run verification command (npm run test:fast <path>) and paste terminal proof`

---

## 4. File Structure Diff

```text
Modify:
- src/types/index.ts                          (Add LeaveType, AttendanceRequest, OfficeLocation, MonthlyTimesheet)
- src/lib/db/schema.ts                        (DDL migrations for requests, locations, pin_hash, and location_id)
- src/lib/db/repo.ts                          (Add methods for requests, PINs, locations, and monthly ranges)
- src/lib/db/seed.ts                          (Add mock PINs, office locations, and sample leave requests)
- src/lib/geo.ts                              (Add multi-location geofence validator)
- src/lib/services/recap.ts                   (Incorporate approved leave requests into daily recap metrics)
- src/app/api/attendance/check-in/route.ts    (Add PIN check and multi-location validation)
- src/app/api/attendance/check-out/route.ts   (Add PIN verification guard)

Create:
- src/lib/auth.ts                             (Zero-dependency crypto PIN hashing & verification)
- src/lib/services/timesheet.ts               (Monthly hours, punctuality, and attendance aggregator)
- src/lib/services/export.ts                  (CSV/spreadsheet timesheet generator)
- src/app/api/attendance/requests/route.ts    (Submit & list leave/WFH/sick requests)
- src/app/api/attendance/requests/[id]/route.ts (Approve/reject leave requests)
- src/app/api/attendance/history/route.ts     (Monthly timesheet & logbook query endpoint)
- src/app/api/config/locations/route.ts       (Multi-hub office location management)
- src/app/api/interns/verify-pin/route.ts     (Intern PIN verification endpoint)
- src/app/api/reports/monthly-export/route.ts (Downloadable CSV report for university mentors)

Test:
- tests/types-schema.test.ts                  (Schema migrations & domain entity integrity)
- tests/api-requests.test.ts                  (Leave/WFH/Sakit submission, filtering, and approval)
- tests/auth-pin.test.ts                      (PIN hashing, validation, and anti-proxy guard)
- tests/geo-multi.test.ts                     (Multi-hub geofencing resolution)
- tests/api-history.test.ts                   (Monthly timesheet calculation & history API)
- tests/recap-leaves.test.ts                  (Daily recap with excused leaves vs absences)
- tests/export.test.ts                        (CSV university logbook export streamer)
```

---

## 5. Granular Tasks (Strictly Divided by Track)

### Track A: [BACKEND / branch: vicky]

- [x] **Task A1: SSOT Domain Types & SQLite Schema Migrations**
  - **Step 1: Write the failing test** (`tests/types-schema.test.ts`)
    - Test creation of `office_locations` table and inserting multi-site coordinates.
    - Test creation of `attendance_requests` table with foreign key to `interns` and constraint checks (`status`, `type`).
    - Test adding `pin_hash` to `interns` and `location_id` to `attendance_logs`.
  - **Step 2: Implement minimum passing code**
    - Update `src/types/index.ts` with SSOT types (`LeaveType`, `RequestStatus`, `AttendanceRequest`, `OfficeLocation`, `MonthlyTimesheetSummary`).
    - Update `src/lib/db/schema.ts` with new DDL definitions and alter-table migrations.
    - Update `src/lib/db/seed.ts` with default PINs (`123456`) and default office hubs (KPPTI & BSD Serpong).
  - **Step 3: Run verification command**
    - `npm run test:fast tests/types-schema.test.ts`
    - Verified 4/4 tests passing in 10ms. Full suite: 66/66 passing.

- [x] **Task A2: Leave, Sick & Remote Work Request Engine (`attendance_requests`)**
  - **Step 1: Write the failing test** (`tests/api-requests.test.ts`)
    - Test `POST /api/attendance/requests` creates a `PENDING` request for `WFH`, `SAKIT`, or `IZIN`.
    - Test rejection of duplicate request for the same intern on the same date with `409 Conflict`.
    - Test `GET /api/attendance/requests?internId=...` returns intern's request history.
    - Test `PATCH /api/attendance/requests/[id]` allows supervisor/mentor to `APPROVE` or `REJECT`.
  - **Step 2: Implement minimum passing code**
    - Add request CRUD operations in `src/lib/db/requests-repo.ts`.
    - Create `src/app/api/attendance/requests/route.ts` (GET & POST).
    - Create `src/app/api/attendance/requests/[id]/route.ts` (PATCH).
  - **Step 3: Run verification command**
    - `npm run test:fast tests/api-requests.test.ts`
    - Verified 7/7 tests passing in 45ms.

- [x] **Task A3: Anti-Proxy Authentication & PIN Verification Layer**
  - **Step 1: Write the failing test** (`tests/auth-pin.test.ts`)
    - Test hashing and verification of 4-6 digit numeric PINs using native `node:crypto`.
    - Test `POST /api/interns/verify-pin` returns success for valid PIN and 401 for incorrect PIN.
    - Test `POST /api/attendance/check-in` rejects request if PIN does not match intern profile.
    - Test `POST /api/attendance/check-out` rejects request if PIN does not match.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/auth.ts` (`hashPin`, `verifyPin`).
    - Create `src/app/api/interns/verify-pin/route.ts`.
    - Update `src/app/api/attendance/check-in/route.ts` and `check-out/route.ts` to enforce PIN verification when configured.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/auth-pin.test.ts`
    - Verified 8/8 tests passing in 47ms. Full suite: 81/81 passing.

- [x] **Task A4: Multi-Office Geofencing Hub Engine**
  - **Step 1: Write the failing test** (`tests/geo-multi.test.ts`)
    - Test `verifyMultiLocationGeofence` against multiple office coordinates (e.g. KPPTI Jakarta vs BSD Serpong).
    - Coordinate within 50m of BSD Serpong must be accepted even if 25km away from KPPTI.
    - Coordinate outside all registered hubs must be rejected.
    - Test `GET & POST /api/config/locations` to query and add office hubs.
  - **Step 2: Implement minimum passing code**
    - Update `src/lib/geo.ts` with `findMatchingLocation(coords, locations)`.
    - Add location queries in `src/lib/db/locations-repo.ts`.
    - Create `src/app/api/config/locations/route.ts`.
    - Update `POST /api/attendance/check-in/route.ts` to check all active locations and record `location_id`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/geo-multi.test.ts`
    - Verified 8/8 tests passing in 120ms.

- [x] **Task A5: Timesheet & Monthly History Aggregator API**
  - **Step 1: Write the failing test** (`tests/api-history.test.ts`)
    - Test `GET /api/attendance/history?internId=intern-sarah&month=2026-10`.
    - Verify aggregated counts: total days, on-time, late, early departure, WFH, sick, absent.
    - Verify calculation of total accumulated hours worked.
    - Verify punctuality percentage calculation.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/services/timesheet.ts` (`calculateMonthlyTimesheet`).
    - Add date range queries in `src/lib/db/repo.ts` (`getAttendanceRecordsForMonth`, `getAttendanceRequestsForMonth`).
    - Create `src/app/api/attendance/history/route.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/api-history.test.ts`
    - Verified 2/2 tests passing in 41ms.

- [x] **Task A6: Enhanced Daily Recap Integration (Sakit, Izin, WFH Distinction)**
  - **Step 1: Write the failing test** (`tests/recap-leaves.test.ts`)
    - Verify intern with approved `WFH` is categorized as `WFH` in daily recap instead of `ABSENT`.
    - Verify intern with approved `SAKIT` is marked as `SAKIT` (excused absence).
    - Verify WhatsApp broadcast formatter formats badges `[WFH]` and `[SAKIT]`.
    - Verify Nodemailer HTML recap includes distinct badge styling for leave types.
  - **Step 2: Implement minimum passing code**
    - Update `src/lib/services/recap.ts` to join `attendance_requests` on target date.
    - Update WhatsApp broadcast message builder in `src/lib/services/whatsapp.ts`.
    - Update HTML table template in `src/lib/services/email.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/recap-leaves.test.ts`
    - Verified 3/3 tests passing in 8ms.

- [x] **Task A7: Monthly University Report Export Streamer (CSV)**
  - **Step 1: Write the failing test** (`tests/export.test.ts`)
    - Test `GET /api/reports/monthly-export?internId=intern-sarah&month=2026-10`.
    - Verify CSV output headers: `NIM/ID,Nama,Divisi,Tanggal,Jam Masuk,Jam Pulang,Total Jam,Status,Keterangan`.
    - Verify HTTP headers `Content-Type: text/csv` and `Content-Disposition`.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/services/export.ts` (`generateMonthlyTimesheetCsv`).
    - Create `src/app/api/reports/monthly-export/route.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/export.test.ts`
    - Verified 3/3 tests passing in 41ms.

- [x] **Task A8: Full Backend Regression Suite & Benchmark**
  - **Step 1: Run complete test suite**
    - Run `npm test`.
  - **Step 2: Verify zero regressions**
    - Ensure all previous 62 tests continue to pass alongside all new Phase 3 tests.
  - **Step 3: Verification Proof**
    - Verified: 97 tests passing across 43 suites, 0 failures. Total execution time: 3.6s.

---

### Track B: [FRONTEND / branch: zacky] (Reference Only — Out of Scope for Vicky)

- [ ] **Task B1: Bottom Tab Navigation Shell** (`branch: zacky`)
  - Tabs: `[Presensi (Punch), Riwayat (Logbook), Pengajuan (Izin/WFH), Profil]`.
- [ ] **Task B2: PIN Input & Secure Device Lock Modal** (`branch: zacky`)
  - 4-digit PIN pad before punching attendance to prevent proxy check-in.
- [ ] **Task B3: Pengajuan Izin/Sakit/WFH Form & Attachment Upload** (`branch: zacky`)
  - Form submitting to `/api/attendance/requests`.
- [ ] **Task B4: Monthly Timesheet & Calendar Matrix UI** (`branch: zacky`)
  - Interactive calendar displaying daily status dots and monthly hour totals from `/api/attendance/history`.
- [ ] **Task B5: Multi-Hub Office Location Selector** (`branch: zacky`)
  - Auto-selects closest registered IOH office hub from `/api/config/locations`.
