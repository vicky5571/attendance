# Implementation Plan: Backend Notifications & Automation Engine (Phase 2)

**Date:** 2026-10-08  
**Target Branch:** `vicky` (`BACK-END SPECIALIST`)  
**Specification Reference:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)  
**Architecture Document:** [`docs/architecture-system-invariants.md`](../../architecture-system-invariants.md)  

---

## 1. Goal & Architecture Overview

Build the background automation, WhatsApp Baileys integration, Nodemailer email delivery, and daily attendance recap engine for branch `vicky`.
- **Daily Recap Aggregator (`src/lib/services/recap.ts`):** Aggregates attendance logs, determines absentees among active interns, computes division-level attendance metrics, and structures data for dispatch.
- **WhatsApp Gateway (`src/lib/services/whatsapp.ts`):** WhatsApp automation using `@whiskeysockets/baileys`. Manages local auth state session, provides QR pairing string for admin UI, and formats daily intern/mentor broadcast messages.
- **Email Delivery Service (`src/lib/services/email.ts`):** Generates responsive HTML recap tables and dispatches them via Nodemailer to supervisor (`EMAIL_ATASAN`) and individual mentors.
- **Automated Dispatcher & APIs:**
  - `POST /api/reports/daily-recap`: Dispatches daily WhatsApp and Email recaps (manual trigger & cron).
  - `GET /api/reports/daily-recap?date=...`: Previews recap summary.
  - `GET /api/whatsapp/status`: Checks Baileys connection state and returns pairing QR.
  - `POST /api/whatsapp/connect`: Reconnects or initializes Baileys session.
- **Cron Scheduler (`src/lib/cron/scheduler.ts`):** Automated trigger scheduled for 18:00 WIB daily.

---

## 2. Branch Scoping & Role Isolation

- **Active Track:** `[BACKEND / branch: vicky]`
- **Frontend Track (`zacky`):** Zacky can concurrently integrate check-in/out buttons and build the admin QR view against `/api/whatsapp/status` without touching server notification engines.
- **Hard Guardrails:**
  - Do NOT modify any UI components, CSS styling, or PWA service worker configs.
  - WhatsApp sessions (`baileys_auth_info/`) must remain ignored by git.
  - Test suites must use mockable socket/transporter layers to run instantly (<300ms) without requiring live SMTP or WhatsApp connection.

---

## 3. Global Invariants & Constraints

1. **SSOT Rule:** All interfaces (`DailyRecapSummary`, `OfficeConfig`, `InternProfile`, `AttendanceRecord`) MUST import directly from `src/types/index.ts`.
2. **File Size Limit:** Keep service and route handler files under 250 lines.
3. **Execution Latency:** Fast test target `<500ms` total with zero external network dependencies during tests.
4. **Mandatory 3-Step Execution Loop:**
   - Step 1: Write the failing test.
   - Step 2: Implement minimum passing code.
   - Step 3: Run verification command and paste terminal proof.

---

## 4. File Structure Diff

```text
Create:
- src/lib/services/recap.ts         (Attendance aggregation & absentee detection)
- src/lib/services/whatsapp.ts      (Baileys socket manager, QR stream, and message formatters)
- src/lib/services/email.ts         (HTML table email generator and Nodemailer transporter)
- src/lib/cron/scheduler.ts         (Cron trigger for daily 18:00 WIB recap)
- src/app/api/reports/daily-recap/route.ts
- src/app/api/whatsapp/status/route.ts
- src/app/api/whatsapp/connect/route.ts

Test:
- tests/recap.test.ts               (Unit tests for daily aggregation, formatters, HTML generation)
- tests/services.test.ts            (Unit tests for WhatsApp & Email service dispatchers)
- tests/api-reports.test.ts         (Integration tests for report & WhatsApp routes)
```

---

## 5. Granular Tasks (Strictly Divided by Track)

### Track A: [BACKEND / branch: vicky]

- [x] **Task A1: Daily Attendance Recap Aggregator & Formatters**
  - **Step 1: Write the failing test** (`tests/recap.test.ts`)
    - Test absentee calculation (active interns who did not check in).
    - Test division metrics (attendance rate, late count, early departure count).
    - Test WhatsApp text formatter for Interns Group (emoji formatting, bullet points).
    - Test WhatsApp text formatter for Mentors Group (division breakdown).
    - Test HTML table email template generation.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/services/recap.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/recap.test.ts`
    - Verify 0 failures in < 150ms. (Result: 4/4 passing in 11ms)

- [x] **Task A2: Email Notification Engine (Nodemailer)**
  - **Step 1: Write the failing test** (`tests/email.test.ts`)
    - Test transporter creation (mockable for tests).
    - Test email dispatch to supervisor and division mentors with mentee filtering.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/services/email.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/email.test.ts` (Result: 1/1 passing in 11ms)

- [x] **Task A3: WhatsApp Baileys Gateway & Session Manager**
  - **Step 1: Write the failing test** (`tests/whatsapp.test.ts`)
    - Test socket lifecycle state machine (`disconnected`, `connecting`, `connected`).
    - Test QR code event handler and pairing string generation.
    - Test message sending function with mock socket.
  - **Step 2: Implement minimum passing code**
    - Create `src/lib/services/whatsapp.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/whatsapp.test.ts` (Result: 4/4 passing in 4ms)

- [x] **Task A4: Reports & WhatsApp REST API Endpoints**
  - **Step 1: Write the failing test** (`tests/api-reports.test.ts`)
    - Test `GET /api/reports/daily-recap?date=...` (preview summary).
    - Test `POST /api/reports/daily-recap` (triggers email & WhatsApp dispatch).
    - Test `GET /api/whatsapp/status` & `POST /api/whatsapp/connect`.
  - **Step 2: Implement minimum passing code**
    - Implement `src/app/api/reports/daily-recap/route.ts`.
    - Implement `src/app/api/whatsapp/status/route.ts`.
    - Implement `src/app/api/whatsapp/connect/route.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/api-reports.test.ts` (Result: 4/4 passing in 33ms)

- [x] **Task A5: Scheduled Background Cron Trigger**
  - **Step 1: Write the failing test** (`tests/cron.test.ts`)
    - Verify cron schedule syntax (18:00 WIB = 11:00 UTC) and trigger callback invocation.
  - **Step 2: Implement minimum passing code**
    - Implement `src/lib/cron/scheduler.ts`.
  - **Step 3: Run verification command**
    - `npm run test:fast tests/cron.test.ts` (Result: 2/2 passing in 85ms)

- [x] **Task A6: Full Backend Suite Verification & Regression Check**
  - **Step 1: Run complete test suite**
    - `npm test`
  - **Step 2: Verify zero regressions across Phase 1 & Phase 2**
    - Total: 47 tests passing across 21 suites, 0 failures.
  - **Step 3: Paste terminal output proof into summary artifact**

---

### Track B: [FRONTEND / branch: zacky] (Reference Only)

- [ ] **Task B5: WhatsApp Admin QR Pairing View** (`branch: zacky`)
- [ ] **Task B6: Manual Recap Trigger & Preview Modal** (`branch: zacky`)
