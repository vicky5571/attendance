# Intern Registration System with Biometric Face Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a self-service intern registration system with biometric face verification using `sharp`, backend persistence in SQLite, credential hashing (`scrypt` password and `sha256` PIN), and an isolated raw HTML/CSS registration form (`src/app/register/page.tsx`) that does not interfere with the frontend PWA styling on branch `zacky`.

**Architecture:**
- **Domain Layer (`src/types/index.ts`)**: Single Source of Truth interfaces `InternRegistrationPayload` and `RegistrationResponse`.
- **Biometric Face Detection Service (`src/lib/services/face-detection.ts`)**: Fast, zero-dependency biometric face detection using `sharp` analyzing resolution, Kovac et al. YCbCr chromatic skin tone clustering, and facial feature variance.
- **REST Registration API (`POST /api/auth/register`)**: Endpoint handling payload validation, biometric face check (rejecting non-faces with HTTP 422), image writing to `/public/uploads/faces/`, password & PIN hashing, and database insertion via `createIntern`.
- **Isolated Raw HTML/CSS Registration Page (`src/app/register/page.tsx`)**: Lightweight semantic HTML form with live webcam video capture, snapshot preview, fallback file picker, and scoped vanilla CSS.

**Tech Stack:** Node.js v26.8.1 (ESM), Next.js 16.4.0 (App Router), SQLite (`node:sqlite` DatabaseSync), `sharp` (^0.35.5), Node Native Test Runner (`node:test`).

**Spec Reference:** [`docs/superpowers/specs/2026-10-15-intern-registration-face-verification-design.md`](../specs/2026-10-15-intern-registration-face-verification-design.md)

---

## Execution Track & Guardrails

- **Active Branch:** `vicky` (`BACK-END SPECIALIST`).
- **Scope Discipline:** Only backend APIs, services, SQLite persistence, unit/integration tests, and an isolated raw HTML/CSS form at `/register`. Do NOT modify Tailwind v4 PWA styles or mobile components.
- **Test Performance Target:** Sub-500ms execution latency with `npm run test:fast <path>`.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | SSOT domain types: `InternRegistrationPayload`, `RegistrationResponse` |
| Create | `src/lib/services/face-detection.ts` | Sharp-based biometric face detection engine |
| Create | `tests/face-detection.test.ts` | Unit tests for face detection service |
| Create | `src/app/api/auth/register/route.ts` | Registration API route handling validation, face check, and persistence |
| Create | `tests/registration-api.test.ts` | Integration tests for `POST /api/auth/register` |
| Create | `src/app/register/page.tsx` | Isolated raw HTML/CSS registration page with webcam stream & fallback |

---

### Task 1: Domain Types (`src/types/index.ts`) [BACKEND / branch: vicky]

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write type definitions for registration**
  Add `InternRegistrationPayload` and `RegistrationResponse` to `src/types/index.ts`.
- [ ] **Step 2: Verify type check passes**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 2: Biometric Face Detection Service (`src/lib/services/face-detection.ts`) [BACKEND / branch: vicky]

**Files:**
- Create: `src/lib/services/face-detection.ts`
- Create: `tests/face-detection.test.ts`

- [ ] **Step 1: Write failing tests in `tests/face-detection.test.ts`**
  Test cases:
  1. Detects face in a simulated human portrait buffer (valid dimensions, skin chromatic cluster, feature variance).
  2. Rejects image with invalid/too-small dimensions (<150x150).
  3. Rejects image with no skin tones (e.g. pure blue/green solid color, scenery).
  4. Rejects uniform flat images with no facial variance/contrast (e.g. solid peach color).
  5. Handles corrupted/non-image buffer gracefully with false detection.
- [ ] **Step 2: Implement `src/lib/services/face-detection.ts`**
  Implement `detectFace(buffer: Buffer): Promise<FaceDetectionResult>` using `sharp`.
- [ ] **Step 3: Run verification command**
  Run `npm run test:fast tests/face-detection.test.ts` and ensure all tests pass in <500ms.

---

### Task 3: Intern Registration REST API (`POST /api/auth/register`) [BACKEND / branch: vicky]

**Files:**
- Create: `src/app/api/auth/register/route.ts`
- Create: `tests/registration-api.test.ts`

- [ ] **Step 1: Write failing integration tests in `tests/registration-api.test.ts`**
  Test cases:
  1. Registers new intern with valid payload and human face photo, returning 201 with saved profile.
  2. Verifies photo is stored on disk under `public/uploads/faces/` and mapped to `interns.photo_url`.
  3. Rejects payload missing mandatory fields with 400.
  4. Rejects invalid email format or duplicate email with 400/409.
  5. Rejects invalid 6-digit PIN with 400.
  6. Rejects upload where face detection fails (e.g. solid red image) with 422 Unprocessable Entity.
  7. Newly registered intern can immediately authenticate via `POST /api/auth/login`.
- [ ] **Step 2: Implement `src/app/api/auth/register/route.ts`**
  Validate fields, run `detectFace`, write image to disk, hash password (`scrypt`), hash/store PIN, call `createIntern`, and return `201`.
- [ ] **Step 3: Run verification command**
  Run `npm run test:fast tests/registration-api.test.ts` and ensure all tests pass.

---

### Task 4: Isolated Raw HTML/CSS Registration Page (`src/app/register/page.tsx`) [BACKEND / branch: vicky]

**Files:**
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Build raw HTML/CSS form component**
  Build `src/app/register/page.tsx` using native semantic elements and scoped `<style>` block:
  - Form fields: Name, Email, Password, PIN, Division, Mentor Name, Mentor Email, University, Major, End Date, Assigned Office.
  - Video element (`<video>`) + Capture button (`<button>`) + offscreen `<canvas>` for snapshot.
  - File picker fallback (`<input type="file" accept="image/*">`).
  - Preview card with "Ambil Ulang" and "Gunakan Foto".
  - Async fetch submission to `/api/auth/register` with error alerts and success state.
- [ ] **Step 2: Verify page build with `npm run build`**
  Ensure Next.js compiles the `/register` route cleanly without any type or lint errors.

---

### Task 5: Full Suite Verification & Regression Check [BACKEND / branch: vicky]

- [ ] **Step 1: Run complete test suite**
  Run `npm test` to confirm all 186+ tests pass with zero regressions.
- [ ] **Step 2: Commit backend deliverables on branch `vicky`**
  Commit with clear conventional commit messages.
