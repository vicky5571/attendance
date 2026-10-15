# Frontend PWA Intern Registration & Biometric UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the raw isolated registration prototype into a production-grade, mobile-first PWA registration flow with live biometric camera capture, responsive form validation, accessible error feedback (specifically handling HTTP 422 biometric face check failures), and login integration, while enforcing the <250 lines God-file architectural invariant.

**Architecture:**
- **Coordinator View (`src/app/register/page.tsx`)**: Lightweight orchestrator page kept under ~150 lines handling form state, API dispatch, and condition-based view switching.
- **Biometric Camera Subcomponent (`src/components/register/BiometricCameraCapture.tsx`)**: Encapsulated camera hardware lifecycle, 1:1 viewfinder overlay guide, canvas snapshot, and manual image file fallback.
- **Registration Success Subcomponent (`src/components/register/RegistrationSuccessCard.tsx`)**: Dedicated celebratory post-registration confirmation view with verified badge and direct CTA to `/login`.
- **Login Screen CTA (`src/app/login/page.tsx`)**: Seamless navigation entry point under the intern login tab.
- **Validation & Client Flow Integration Test (`tests/registration-flow.test.ts`)**: Fast automated harness validating payload shape, HTTP 422 biometric error decoding, and sanitization helpers.

**Tech Stack:** Next.js 16.4.0 (App Router), React 19.3.0, Tailwind CSS v4, HTML5 MediaDevices & Canvas API, Node.js Native Test Runner (`node:test`).

**Spec & Handover Reference:**
- [`docs/frontend-handover-intern-registration.md`](../../frontend-handover-intern-registration.md)
- [`docs/superpowers/specs/2026-10-15-intern-registration-face-verification-design.md`](../specs/2026-10-15-intern-registration-face-verification-design.md)

---

## Execution Track & Branch Guardrails

- **Active Branch:** `zacky` (`FRONT-END SPECIALIST`) or `feat/frontend`.
- **Scope Discipline:**
  - Front-end only: Tailwind CSS v4 UI components, client-side camera handling, form inputs, and test runner verification.
  - **DO NOT** edit database models, migration files, or backend API business logic.
- **Architectural Invariants:**
  - Single Source of Truth: All interfaces (`InternRegistrationPayload`, `OfficeLocation`) imported from `src/types/index.ts`.
  - Strangler Pattern on God Files: `src/app/register/page.tsx` must strictly stay under 250 lines by extracting atomic subcomponents into `src/components/register/`.
  - Fast Test Harness: Sub-500ms execution latency with `npm run test:fast <path>`.

---

## File Structure Diff

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/login/page.tsx` | Add "Daftar Akun Baru" link on intern login card |
| Create | `src/components/register/BiometricCameraCapture.tsx` | Atomic camera viewfinder, 1:1 square crop, mirror flip & fallback picker |
| Create | `src/components/register/RegistrationSuccessCard.tsx` | Post-registration success modal & redirect CTA |
| Modify | `src/app/register/page.tsx` | Streamlined coordinator page (<180 lines) assembling forms & subcomponents |
| Create | `tests/registration-flow.test.ts` | Verification test for payload integrity, PIN format, and HTTP 422 error parsing |

---

## Granular Implementation Tasks

### Track B: [FRONTEND / branch: zacky]

---

### Task 1: Client Registration Flow & Error Parser Unit Tests

**Files:**
- Create: `tests/registration-flow.test.ts`

- [x] **Step 1: Write failing tests in `tests/registration-flow.test.ts`**
  Validate payload field constraints (6-digit numeric PIN, mandatory corporate email, non-empty facePhoto data URL) and error message parser for HTTP 400, 409, and 422 statuses.
- [x] **Step 2: Implement validation & error formatting helpers in `src/lib/registration-helpers.ts`**
  Add helper functions: `validateRegistrationForm(data)` and `getFriendlyRegistrationError(status, serverMessage)`.
- [x] **Step 3: Run verification command**
  Run `npm run test:fast tests/registration-flow.test.ts` and confirm all tests pass in <300ms.

---

### Task 2: Atomic Biometric Camera Capture Component

**Files:**
- Create: `src/components/register/BiometricCameraCapture.tsx`

- [x] **Step 1: Write component specification**
  Encapsulate:
  1. `getUserMedia` stream lifecycle (auto cleanup on unmount).
  2. 1:1 square aspect ratio viewfinder with face guide oval dashed overlay.
  3. Mirrored canvas snapshot generation (`scale(-1, 1)`).
  4. Retake button (`setFacePhoto(null)`) and file upload fallback (`<input type="file" accept="image/*">`).
- [x] **Step 2: Implement `BiometricCameraCapture.tsx`**
  Build using Tailwind CSS v4 design tokens (`#ED0278`, rounded-2xl, smooth transitions).
- [x] **Step 3: Verify component compilation**
  Run `npx tsc --noEmit` and verify zero TypeScript errors.

---

### Task 3: Atomic Registration Success View Component

**Files:**
- Create: `src/components/register/RegistrationSuccessCard.tsx`

- [x] **Step 1: Write component specification**
  Display:
  1. Emerald checkmark badge with subtle pulsing animation.
  2. Registrant name, email, and registered face thumbnail preview.
  3. Status badge: `ACTIVE (Terverifikasi)`.
  4. Primary CTA button navigating to `/login`.
- [x] **Step 2: Implement `RegistrationSuccessCard.tsx`**
  Build clean card view adhering to the IOH mobile design system.
- [x] **Step 3: Verify component compilation**
  Run `npx tsc --noEmit` and verify clean typing.

---

### Task 4: Modular Coordinator Page (`src/app/register/page.tsx`) & Login Navigation Link

**Files:**
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/login/page.tsx`

- [x] **Step 1: Refactor `src/app/register/page.tsx` into clean coordinator (<250 lines)**
  Import `BiometricCameraCapture`, `RegistrationSuccessCard`, and `validateRegistrationForm`.
  Provide structured 3-section layout:
  - Bagian 1: Akun & Kredensial (Nama, Email, Password, PIN 6-digit)
  - Bagian 2: Data Magang & Penugasan (Universitas, Jurusan, Divisi, Mentor, Tanggal Selesai, Lokasi Kantor)
  - Bagian 3: Biometrik Wajah Referensi
- [x] **Step 2: Integrate navigation link in `src/app/login/page.tsx`**
  Add "Peserta magang baru? Daftar Akun & Biometrik" anchor pointing to `/register`.
- [x] **Step 3: Verify coordinator line count & test suite**
  Verify `src/app/register/page.tsx` is <250 lines and run `npm test`.

---

### Task 5: End-to-End Build & Visual Regression Verification

- [x] **Step 1: Production bundle compilation**
  Run `npm run build` and ensure Turbopack builds `/register` and `/login` without errors or warnings.
- [x] **Step 2: Fast test suite validation**
  Run `npm test` and ensure all 197+ tests continue to pass with 0 regressions.
- [x] **Step 3: Commit frontend deliverables**
  Commit work with message `feat(frontend): implement modular PWA intern registration and biometric camera UI`.
