# Frontend PIN Removal & Frictionless Attendance Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 6-digit PIN modal and input requirements from the client-side user experience on branch `zacky`. Streamline the attendance punch flow so that confirming a live selfie immediately records the check-in or check-out punch without interrupting the user with a redundant PIN prompt. Eliminate the PIN field from the new intern registration form.

**Architecture:**
- **Main Attendance Flow ([`src/app/page.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/app/page.tsx))**:
  - In `handleSelfieCaptured`: Upon successful selfie upload via `POST /api/attendance/upload-photo`, close `SelfieModal` and directly trigger `executeAttendance(photoUrl)` without opening `PinModal`.
  - Remove `pinModalOpen` state and unmount [`PinModal`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/PinModal.tsx).
- **Registration Form Fields ([`src/components/register/InternFormFields.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/register/InternFormFields.tsx))**:
  - Remove the 6-digit PIN input block (label, input `name="pin"`, and validation hints) from Section 1 ("Informasi Akun & Keamanan").
- **Client Auth Helper ([`src/lib/client-auth.ts`](file:///Users/mac/Web%20Development/indosat/attendance/src/lib/client-auth.ts))**:
  - Update `loginIntern` to accept `password` or route intern credentials to `loginUnified(identifier, password)`.
- **Component Pruning ([`src/components/PinModal.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/PinModal.tsx))**:
  - Archive or safely decouple `PinModal` from active production bundles.

**Tech Stack:** Next.js 16.4.0 (App Router), React 19.3.0, Tailwind CSS v4, Node Native Test Runner (`node:test`).

**Handover Reference:** [`docs/frontend-handover-pin-removal.md`](../frontend-handover-pin-removal.md)  
**Backend Baseline Reference:** Commit `6362a98` on branch `vicky` (211/211 passing tests)

---

## Execution Track & Guardrails

- **Target Branch:** `zacky` (`FRONT-END SPECIALIST`).
- **Scope Discipline:** Strictly client components, PWA views, mobile layouts, and form fields. Do NOT modify backend API handlers or SQLite migration files.
- **Mobile Viewport Target:** 375px – 430px (iPhone SE to iPhone 16 Pro Max). Avoid scroll traps or fixed viewport breakages (`h-screen` vs `h-[100dvh]`).
- **Performance Target:** Zero regressions across all 211 tests. Clean production build via `npm run build`.

---

## File Structure & Impact Matrix

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/page.tsx` | Punch directly after selfie capture; remove `PinModal` |
| Modify | `src/components/register/InternFormFields.tsx` | Remove PIN Presensi input block |
| Modify | `src/lib/client-auth.ts` | Update `loginIntern` to accept password or omit PIN |
| Delete / Archive | `src/components/PinModal.tsx` | Decouple/archive unused modal component |
| Create / Update | `tests/client-punch-flow.test.ts` | Unit/integration test for direct punch without PIN |

---

### Task 1: Eliminate PIN Step from Main Attendance Flow (`src/app/page.tsx`) [FRONTEND / branch: zacky (executed on vicky per directive)]

**Files:**
- Modify: `src/app/page.tsx`

- [x] **Step 1: Write the failing test / contract check**
  Verify that `handleSelfieCaptured` initiates the attendance punch call directly without requiring `pinModalOpen: true`.
- [x] **Step 2: Implement minimum passing code**
  1. In `src/app/page.tsx`:
     - Remove `import { PinModal } from '@/components/PinModal';`.
     - Remove `const [pinModalOpen, setPinModalOpen] = useState(false);`.
     - Refactor `executeAttendanceWithPin(pin: string)` into `executeAttendance(photoUrl?: string)`:
       ```tsx
       const executeAttendance = async (overridePhotoUrl?: string): Promise<boolean> => {
         if (!coords || !pendingActionType) return false;
         setActionLoading(true);
         const targetDate = simulatedDate || todayStr || new Date().toISOString().split('T')[0];
         const timestampPayload = simulatedTime ? `${targetDate}T${simulatedTime}:00` : undefined;

         try {
           const activePhotoUrl = overridePhotoUrl || pendingSelfiePhotoUrl;
           const punchBody: Record<string, any> = {
             internId: currentInternId,
             latitude: coords.lat,
             longitude: coords.lng,
             locationId: selectedLocationId,
             timestamp: timestampPayload,
           };

           if (activePhotoUrl) {
             punchBody.photoUrl = activePhotoUrl;
             if (pendingActionType === 'check-out') {
               punchBody.checkOutPhotoUrl = activePhotoUrl;
             }
           }

           const res = await fetch(`/api/attendance/${pendingActionType}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(punchBody),
           });
           ...
       ```
     - In `handleSelfieCaptured(base64Image: string)`:
       ```tsx
       setPendingSelfiePhotoUrl(data.photoUrl);
       setIsUploadingSelfie(false);
       setSelfieModalOpen(false);
       // Directly punch attendance without PIN prompt
       await executeAttendance(data.photoUrl);
       ```
     - Remove `<PinModal ... />` from the JSX return tree.
- [x] **Step 3: Run verification command**
  Run `npx tsc --noEmit` and confirm zero TypeScript errors.

---

### Task 2: Remove PIN Field from Registration Form (`src/components/register/InternFormFields.tsx`) [FRONTEND / branch: zacky (executed on vicky per directive)]

**Files:**
- Modify: `src/components/register/InternFormFields.tsx`

- [x] **Step 1: Write contract check**
  Ensure form renders without the PIN input field, and submission does not complain about missing PIN.
- [x] **Step 2: Implement minimum passing code**
  1. In `src/components/register/InternFormFields.tsx`:
     - Remove lines ~138–154:
       ```tsx
       {/* Removed PIN presensi input block */}
       ```
     - Section 1 now cleanly contains only `namaLengkap`, `email`, and `password`.
- [x] **Step 3: Run verification command**
  Run `npm run test:fast tests/registration-flow.test.ts` to confirm client validation tests pass.

---

### Task 3: Streamline Client Auth Helper (`src/lib/client-auth.ts`) [FRONTEND / branch: zacky (executed on vicky per directive)]

**Files:**
- Modify: `src/lib/client-auth.ts`

- [x] **Step 1: Check type signature**
  Verify `loginIntern` allows password authentication without requiring PIN.
- [x] **Step 2: Implement minimum passing code**
  In `src/lib/client-auth.ts`:
  - Update `loginIntern`:
    ```ts
    export async function loginIntern(
      internId: string,
      password?: string,
      pin?: string
    ): Promise<AuthResponse> {
      const payload: InternLoginPayload = {
        role: 'INTERN',
        internId,
        password,
        pin,
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      return data as AuthResponse;
    }
    ```
- [x] **Step 3: Run verification command**
  Run `npx tsc --noEmit`.

---

### Task 4: Archive or Decouple PinModal (`src/components/PinModal.tsx`) [FRONTEND / branch: zacky (executed on vicky per directive)]

**Files:**
- Modify / Delete: `src/components/PinModal.tsx`

- [x] **Step 1: Check for references across repository**
  Run `grep -rn "PinModal" src/` and ensure zero active consumers.
- [x] **Step 2: Archive or delete unused component**
  Remove `src/components/PinModal.tsx` to trim unused client JavaScript bundle overhead.
- [x] **Step 3: Run verification command**
  Run `npx tsc --noEmit` and confirm clean build.

---

### Task 5: Full Suite & Mobile UX Regression Check [FRONTEND / branch: zacky (executed on vicky per directive)]

- [x] **Step 1: Run complete test suite**
  Run `npm test` and verify that all 211 tests pass with 0 failures.
- [x] **Step 2: Run TypeScript type check**
  Run `npx tsc --noEmit` and verify 0 errors.
- [x] **Step 3: Run Next.js production build**
  Run `npm run build` and ensure all 29 routes compile cleanly without bundle warnings.

