# Backend PIN Removal & Frictionless Attendance Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate the 6-digit PIN requirement from the backend architecture (`POST /api/attendance/check-in`, `POST /api/attendance/check-out`, `POST /api/auth/register`, `POST /api/auth/login`, and validation helpers). Attendance validation will rely strictly on session authentication, GPS geofencing, and live selfie photo logging, removing redundant user friction while maintaining data integrity across all 211 test suites.

**Architecture:**
- **Domain Layer (`src/types/index.ts`)**: Update `CheckInPayload`, `CheckOutPayload`, and `InternRegistrationPayload` to remove or mark `pin` as optional/deprecated. Keep `pinHash` optional on `InternProfile` for non-breaking schema compatibility.
- **Attendance Punch Endpoints (`POST /api/attendance/check-in`, `POST /api/attendance/check-out`)**: Remove the anti-proxy PIN verification guard. Successful punches require valid session identity, GPS geofence compliance, and selfie photo URL without rejecting for missing/omitted PIN.
- **Registration Endpoint & Helpers (`POST /api/auth/register`, `src/lib/registration-helpers.ts`)**: Remove mandatory 6-digit PIN validation. New intern onboarding requires full name, email, password, face photo, academic info, and division without requiring PIN.
- **Unified Authentication (`POST /api/auth/login`)**: Preserve unified login via email/identifier + password. Update `role: 'INTERN'` mode to accept password or operate without forcing PIN.
- **Legacy PIN Endpoint (`POST /api/interns/verify-pin`)**: Maintain backward compatibility by returning `{ valid: true }` without rejecting requests.

**Tech Stack:** Node.js v26.8.1 (ESM), Next.js 16.4.0 (App Router), SQLite (`node:sqlite` DatabaseSync), Node Native Test Runner (`node:test`).

---

## Execution Track & Guardrails

- **Active Branch:** `vicky` (`BACK-END SPECIALIST`).
- **Scope Discipline:** Strictly backend API handlers, repository/service layers, types, and test suites. Do NOT modify client PWA layout or Tailwind components (handled under `branch: zacky`).
- **Test Performance Target:** Sub-500ms execution latency with `npm run test:fast <path>`. All 211+ tests must pass with 0 failures before completion.

---

## File Structure & Impact Matrix

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | SSOT domain types: Remove mandatory `pin` from payloads |
| Modify | `src/app/api/attendance/check-in/route.ts` | Remove `verifyPin` guard from check-in handler |
| Modify | `src/app/api/attendance/check-out/route.ts` | Remove `verifyPin` guard from check-out handler |
| Modify | `src/app/api/auth/register/route.ts` | Remove mandatory PIN validation and format check |
| Modify | `src/lib/registration-helpers.ts` | Remove 6-digit PIN validation in `validateRegistrationForm` |
| Modify | `src/app/register/page.tsx` | Remove PIN input field from isolated test registration form |
| Modify | `src/app/api/auth/login/route.ts` | Allow intern login without forcing PIN |
| Modify | `src/app/api/interns/verify-pin/route.ts` | Gracefully return valid for legacy callers |
| Modify | `tests/auth-pin.test.ts` | Update check-in/out tests to verify PIN-less attendance |
| Modify | `tests/registration-api.test.ts` | Update registration tests to verify PIN is no longer required |
| Modify | `tests/registration-flow.test.ts` | Update validation tests without PIN assertions |
| Create | `docs/frontend-handover-pin-removal.md` | Handover guide for frontend team on branch `zacky` |

---

### Task 1: Update SSOT Domain Types (`src/types/index.ts`) [BACKEND / branch: vicky]

**Files:**
- Modify: `src/types/index.ts`

- [x] **Step 1: Write type updates**
  In `src/types/index.ts`:
  1. Make `pin?: string` optional in `CheckInPayload` and `CheckOutPayload`.
  2. Remove or make `pin?: string` optional in `InternRegistrationPayload`.
  3. Update `InternLoginPayload` to allow `password?: string` alongside optional `pin?: string`.
- [x] **Step 2: Verify type check passes**
  Run `npx tsc --noEmit` and confirm zero syntax/type breakage.
- [x] **Step 3: Run fast test verification**
  Run `npm run test:fast tests/types-schema.test.ts` and confirm all tests pass.

---

### Task 2: Remove PIN Verification Guards in Check-In & Check-Out Endpoints [BACKEND / branch: vicky]

**Files:**
- Modify: `src/app/api/attendance/check-in/route.ts`
- Modify: `src/app/api/attendance/check-out/route.ts`
- Modify: `tests/auth-pin.test.ts`

- [x] **Step 1: Write failing tests in `tests/auth-pin.test.ts`**
  Update `tests/auth-pin.test.ts` to assert that:
  1. `POST /api/attendance/check-in` succeeds with 201 without providing `pin` in payload, even if intern has a `pinHash`.
  2. `POST /api/attendance/check-out` succeeds with 200 without providing `pin` in payload.
  3. Check-in and check-out succeed regardless of any arbitrary string in `pin`.
- [x] **Step 2: Implement minimum passing code**
  1. In `src/app/api/attendance/check-in/route.ts`:
     - Remove the `1b. Anti-Proxy PIN Verification Guard` block (lines 60–68).
  2. In `src/app/api/attendance/check-out/route.ts`:
     - Remove the `0b. Anti-Proxy PIN Verification Guard` block (lines 41–50).
- [x] **Step 3: Run verification command**
  Run `npm run test:fast tests/auth-pin.test.ts` and confirm passing results.

---

### Task 3: Remove PIN from Registration API & Validation Helpers [BACKEND / branch: vicky]

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/registration-helpers.ts`
- Modify: `src/app/register/page.tsx`
- Modify: `tests/registration-api.test.ts`
- Modify: `tests/registration-flow.test.ts`

- [x] **Step 1: Write failing tests for PIN-less registration**
  1. In `tests/registration-api.test.ts`:
     - Update payload fixtures to omit `pin`.
     - Confirm `POST /api/auth/register` returns `201 Created` without requiring `pin`.
     - Remove test asserting rejection of non-6-digit PIN.
  2. In `tests/registration-flow.test.ts`:
     - Update `validateRegistrationForm` test fixtures to omit `pin` and verify `isValid: true`.
- [x] **Step 2: Implement minimum passing code**
  1. In `src/app/api/auth/register/route.ts`:
     - Remove `!pin?.trim() ||` from mandatory field checks.
     - Remove `PIN_REGEX` test.
     - Default `pinHash` to `null` or `pin ? pin.trim() : null`.
  2. In `src/lib/registration-helpers.ts`:
     - Remove `if (!data.pin || !/^\d{6}$/.test(data.pin))` check from `validateRegistrationForm`.
  3. In `src/app/register/page.tsx`:
     - Remove the PIN `<input>` and state binding from the raw test form.
- [x] **Step 3: Run verification commands**
  Run `npm run test:fast tests/registration-api.test.ts` and `npm run test:fast tests/registration-flow.test.ts`.

---

### Task 4: Streamline Login & Verify-PIN Backward Compatibility [BACKEND / branch: vicky]

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/interns/verify-pin/route.ts`
- Modify: `tests/api-auth.test.ts`

- [x] **Step 1: Write tests for password-first & non-blocking PIN verification**
  1. In `tests/api-auth.test.ts`:
     - Ensure unified login (`email` + `password` or `internId` + `password`) continues to authenticate cleanly.
  2. In `tests/auth-pin.test.ts`:
     - Ensure `POST /api/interns/verify-pin` returns `{ valid: true }` gracefully.
- [x] **Step 2: Implement minimum passing code**
  1. In `src/app/api/auth/login/route.ts`:
     - Under `if (body.role === 'INTERN')`, accept `password` verification or allow fallback so callers without PIN can authenticate.
  2. In `src/app/api/interns/verify-pin/route.ts`:
     - Return `{ valid: true, message: 'PIN verification bypassed (deprecated)' }` so existing frontend components do not break if invoked.
- [x] **Step 3: Run verification command**
  Run `npm run test:fast tests/api-auth.test.ts` and ensure zero failures.

---

### Task 5: Frontend Handover Documentation (`docs/frontend-handover-pin-removal.md`) [BACKEND / branch: vicky]

**Files:**
- Create: `docs/frontend-handover-pin-removal.md`

- [x] **Step 1: Document frontend removal scope for branch `zacky`**
  Detail exact changes needed by the frontend team:
  1. Remove `PinModal` invocation in `src/app/page.tsx` (punch directly after selfie confirmation).
  2. Remove PIN input field in `src/components/register/InternFormFields.tsx`.
  3. Remove or archive `src/components/PinModal.tsx`.
  4. Update `src/lib/client-auth.ts` to omit PIN parameters.
- [x] **Step 2: Verify documentation links and code references**
  Ensure all file links use proper `file:///` format.

---

### Task 6: Full Regression Verification Suite [BACKEND / branch: vicky]

- [x] **Step 1: Run complete test suite**
  Run `npm test` and verify that all 211+ tests pass with 0 failures.
- [x] **Step 2: Verify type checks**
  Run `npx tsc --noEmit` and confirm 0 errors.
- [x] **Step 3: Verify build**
  Run `npm run build` and ensure Next.js build succeeds cleanly.

