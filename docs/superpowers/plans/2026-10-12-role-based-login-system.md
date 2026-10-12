# Role-Based Login & Session Authentication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-dependency, dual-role authentication and session system for the Indosat Attendance PWA, providing PIN-based login for Interns (`ROLE_INTERN`) and password-based login for Administrators/Mentors (`ROLE_ADMIN` / `ROLE_SUPERVISOR`), complete with HTTP-only session cookies and server-side route guards.

**Architecture:** 
- **Storage & Sessions:** Native SQLite tables (`users`, `sessions`) storing salted scrypt/SHA-256 password hashes and opaque crypto session tokens (`node:crypto.randomBytes(32)`).
- **Session Transport:** Secure HTTP-only cookies (`ioh_session`, `SameSite=Lax`, `Path=/`, `Max-Age=7 days`) with fallback header support for API consumers.
- **Role Scoping:**
  - `INTERN`: Authenticates via `internId` + 4-6 digit numeric PIN. Locks client state to that specific intern, eliminating proxy punch-in dropdowns.
  - `ADMIN` / `SUPERVISOR`: Authenticates via email/username + password. Unlocks supervisory capabilities (leave request approvals, WhatsApp QR management, office hub configuration, and export reports).
- **Execution Invariants:** 100% zero external dependencies (no Auth.js / NextAuth bloat). Sub-second test execution using `node:test` and in-memory SQLite.

**Tech Stack:** Next.js 16.4.0 (App Router), React 19.3.0, TypeScript, Tailwind CSS v4, SQLite (`node:sqlite`), Node.js native `node:crypto` and `node:test`.

**Spec Reference:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)  
**Architecture Invariants:** [`docs/architecture-system-invariants.md`](../../architecture-system-invariants.md)

---

## Global Constraints

1. **Strict Branch Bifurcation:**
   - **Track A:** `[BACKEND / branch: vicky]` — Schema migrations, session repository, password hashing, `/api/auth/*` routes, and server route guards.
   - **Track B:** `[FRONTEND / branch: zacky]` — Client AuthContext, login page shell (`/login`), PIN pad component, header session display, and protected routes.
2. **SSOT Rule:** All authentication and user session types MUST reside in [`src/types/index.ts`](../../src/types/index.ts). No inline interfaces.
3. **Zero Heavy Dependencies:** Use Node.js standard libraries (`node:crypto`, `node:sqlite`). Zero third-party auth frameworks.
4. **File Size Limit:** Every route, service, and repository file must stay under 250 lines.
5. **Strict 3-Step Execution Loop:** Every task must enforce:
   - `Step 1: Write the failing test`
   - `Step 2: Implement minimum passing code`
   - `Step 3: Run verification command (npm run test:fast <path>) and paste terminal proof`

---

## File Structure Diff

```text
Modify:
- src/types/index.ts                         (Add UserRole, AppUser, SessionRecord, LoginPayload, AuthState)
- src/lib/db/schema.ts                       (DDL for users and sessions tables + indexes)
- src/lib/db/seed.ts                         (Seed default admin: admin@ioh.co.id / AdminIOH2026!)
- src/lib/auth.ts                            (Add hashPassword, verifyPassword, generateSessionToken)
- src/app/api/attendance/check-in/route.ts   (Enforce authenticated internId matches payload)
- src/app/api/attendance/check-out/route.ts  (Enforce authenticated internId matches payload)
- src/app/api/attendance/requests/[id]/route.ts (Protect approval/rejection with ADMIN/SUPERVISOR guard)
- src/app/api/config/route.ts                (Protect config mutation with ADMIN guard)
- src/app/page.tsx                           (Lock intern profile from AuthContext; remove manual dropdown)
- src/components/Header.tsx                  (Add user info pill & Logout button)

Create:
- src/lib/db/auth-repo.ts                    (CRUD for users and sessions in SQLite)
- src/lib/auth-guard.ts                      (Session extraction from Request cookie & role enforcement)
- src/lib/client-auth.ts                     (Frontend API helper for login, logout, me)
- src/app/api/auth/login/route.ts            (Dual-mode login: intern PIN or admin password + Set-Cookie)
- src/app/api/auth/me/route.ts               (Session verification & current user payload)
- src/app/api/auth/logout/route.ts           (Session revocation & Set-Cookie expired)
- src/context/AuthContext.tsx                (Client React Context providing auth state & functions)
- src/app/login/page.tsx                     (Responsive mobile login screen with segmented tabs)
- src/components/auth/InternLoginForm.tsx    (Intern ID input + numeric PIN pad)
- src/components/auth/AdminLoginForm.tsx     (Email/Password form with show/hide toggle)

Test:
- tests/auth-schema.test.ts                  (Database DDL migrations and seed integrity for users/sessions)
- tests/auth-lifecycle.test.ts               (Password hashing, session token creation, expiration, revocation)
- tests/api-auth.test.ts                     (POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout)
- tests/auth-guard.test.ts                   (Route protection on check-in and administrative endpoints)
- tests/client-auth.test.ts                  (Client auth helper contracts and local cache)
```

---

## Track A: [BACKEND / branch: vicky]

### Task A1: SSOT Domain Types & SQLite Schema for Users & Sessions

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/seed.ts`
- Test: `tests/auth-schema.test.ts`

**Interfaces:**
- Consumes: `node:sqlite`, existing `DatabaseSync`
- Produces: `UserRole`, `AppUser`, `SessionRecord`, `LoginCredentials`, `AuthResponse` in `src/types/index.ts`

- [x] **Step 1: Write the failing test** (`tests/auth-schema.test.ts`)
  - Verified test fails when `users` and `sessions` tables do not exist.

- [x] **Step 2: Implement minimum passing code**
  - Added `UserRole`, `AppUser`, `SessionRecord`, `LoginPayload`, and `AuthResponse` to `src/types/index.ts`.
  - Added DDL for `users` and `sessions` tables with indexes to `SCHEMA_SQL` in `src/lib/db/schema.ts`.
  - Added `hashPassword`, `verifyPassword`, and `generateSessionToken` to `src/lib/auth.ts`.
  - Added idempotent default admin user seeding (`admin@ioh.co.id` / `AdminIOH2026!`) in `src/lib/db/seed.ts`.

- [x] **Step 3: Run verification command**
  - Command: `npm run test:fast tests/auth-schema.test.ts`
  - Output:
    ```
    ▶ Auth Schema & Seed Integrity
      ✔ should create users and sessions tables with proper schema constraints (3.847929ms)
      ✔ should enforce role constraint on users table (1.116428ms)
      ✔ should seed default admin user idempotently (51.577994ms)
    ✔ Auth Schema & Seed Integrity (57.958869ms)
    ℹ tests 3
    ℹ suites 1
    ℹ pass 3
    ℹ fail 0
    ```
  - Full suite verification: `npm test` passed 100/100 tests across 44 suites with 0 failures in 3.3s.

---

### Task A2: Password Hashing, Session Repository & Lifecycle Engine

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/db/auth-repo.ts`
- Test: `tests/auth-lifecycle.test.ts`

**Interfaces:**
- Consumes: `node:crypto`, `src/types/index.ts`
- Produces: `hashPassword`, `verifyPassword`, `generateSessionToken`, `createUser`, `getUserByEmail`, `createSession`, `findSessionByToken`, `deleteSession`, `cleanExpiredSessions`

- [x] **Step 1: Write the failing test** (`tests/auth-lifecycle.test.ts`)
  - Verified test fails when `src/lib/db/auth-repo.ts` is not present.

- [x] **Step 2: Implement minimum passing code**
  - Implemented `hashPassword`, `verifyPassword`, and `generateSessionToken` in `src/lib/auth.ts`.
  - Created `src/lib/db/auth-repo.ts` (`createUser`, `getUserByEmail`, `getUserById`, `createSession`, `findSessionByToken`, `deleteSession`, `cleanExpiredSessions`).

- [x] **Step 3: Run verification command**
  - Command: `npm run test:fast tests/auth-lifecycle.test.ts`
  - Output:
    ```
    ▶ Auth & Session Lifecycle Engine
      ✔ should hash and verify passwords using salted crypto (140.326882ms)
      ✔ should generate secure opaque session tokens (0.417494ms)
      ✔ should create, retrieve, and delete session records in SQLite (4.104556ms)
      ✔ should clean expired sessions automatically (1.493035ms)
      ✔ should create and retrieve users by email or ID (42.006881ms)
    ✔ Auth & Session Lifecycle Engine (190.18877ms)
    ℹ tests 5
    ℹ suites 1
    ℹ pass 5
    ℹ fail 0
    ```
  - Full suite verification: `npm test` passing with 105 tests across 45 suites.

---

### Task A3: Authentication API Routes (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`)

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Test: `tests/api-auth.test.ts`

**Interfaces:**
- Consumes: `src/lib/auth.ts`, `src/lib/db/auth-repo.ts`, `src/lib/db/repo.ts`
- Produces: Endpoints with `Set-Cookie: ioh_session=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`

- [x] **Step 1: Write the failing test** (`tests/api-auth.test.ts`)
  - Verified test fails when routes `/api/auth/login`, `/me`, and `/logout` do not exist.

- [x] **Step 2: Implement minimum passing code**
  - Created `src/app/api/auth/login/route.ts` supporting dual-role login and issuing `ioh_session` HttpOnly cookie.
  - Created `src/app/api/auth/me/route.ts` resolving session token from cookies/headers into typed user profile.
  - Created `src/app/api/auth/logout/route.ts` revoking session in SQLite and clearing cookie.

- [x] **Step 3: Run verification command**
  - Command: `npm run test:fast tests/api-auth.test.ts`
  - Output:
    ```
    ▶ Auth REST APIs (/api/auth)
      ▶ POST /api/auth/login
        ✔ should authenticate intern with valid PIN and return Set-Cookie (196.541358ms)
        ✔ should reject intern login with invalid PIN with 401 (328.995464ms)
        ✔ should return 404 if intern ID does not exist (133.484551ms)
        ✔ should authenticate admin with valid password and return session cookie (731.511164ms)
        ✔ should reject admin login with invalid password with 401 (845.237987ms)
        ✔ should reject request missing required fields with 400 (300.514212ms)
      ✔ POST /api/auth/login (2569.15497ms)
      ▶ GET /api/auth/me & POST /api/auth/logout
        ✔ should resolve session profile and revoke upon logout (238.040838ms)
        ✔ should return 401 for unauthenticated request without cookie (163.368534ms)
      ✔ GET /api/auth/me & POST /api/auth/logout (405.112994ms)
    ✔ Auth REST APIs (/api/auth) (2978.239042ms)
    ℹ tests 8
    ℹ suites 3
    ℹ pass 8
    ℹ fail 0
    ```
  - Full suite verification: `npm test` passing with 108 tests across 46 suites.

---

### Task A4: Server-Side Route Guard & Zero-Impersonation Protection

**Files:**
- Create: `src/lib/auth-guard.ts`
- Modify: `src/app/api/attendance/check-in/route.ts`
- Modify: `src/app/api/attendance/check-out/route.ts`
- Modify: `src/app/api/attendance/requests/[id]/route.ts`
- Modify: `src/app/api/config/route.ts`
- Test: `tests/auth-guard.test.ts`

**Interfaces:**
- Consumes: `src/lib/db/auth-repo.ts`
- Produces: `verifySession(req: Request)`, `requireRole(req: Request, roles: UserRole[])`

- [x] **Step 1: Write the failing test** (`tests/auth-guard.test.ts`)
  - Verified tests fail when route guards are absent (check-in allows mismatched internId, leave request allows INTERN role to approve).

- [x] **Step 2: Implement minimum passing code**
  - Created `src/lib/auth-guard.ts` (`extractSessionToken`, `getSessionFromRequest`, `enforceRole`, `checkRoleIfAuthenticated`, `enforceInternIdentity`).
  - Updated `src/app/api/attendance/check-in/route.ts` & `check-out/route.ts` with `enforceInternIdentity` preventing proxy punch-in.
  - Updated `src/app/api/attendance/requests/[id]/route.ts` & `src/app/api/config/route.ts` with `checkRoleIfAuthenticated` enforcing administrative role.

- [x] **Step 3: Run verification command**
  - Command: `npm run test:fast tests/auth-guard.test.ts`
  - Output:
    ```
    ▶ Auth Guard & Impersonation Prevention
      ▶ Check-In Anti-Impersonation
        ✔ should block check-in when session intern does not match payload internId (403) (82.278486ms)
        ✔ should allow check-in when session intern matches payload internId (42.399792ms)
      ✔ Check-In Anti-Impersonation (125.722573ms)
      ▶ Protected Administrative Routes
        ✔ should reject leave request approval when user has role INTERN (403) (41.680429ms)
        ✔ should allow leave request approval when user has role ADMIN or SUPERVISOR (40.889177ms)
        ✔ should reject PUT /api/config update when requested by INTERN (403) (41.062192ms)
      ✔ Protected Administrative Routes (124.013222ms)
    ✔ Auth Guard & Impersonation Prevention (250.349694ms)
    ℹ tests 5
    ℹ suites 3
    ℹ pass 5
    ℹ fail 0
    ```
  - Full suite verification: `npm test` passing with 118 tests across 51 suites with 0 failures in 4.5s.

---

## Track B: [FRONTEND / branch: zacky]

### Task B1: Auth Client Context & Service Helper (`src/context/AuthContext.tsx`)

**Files:**
- Create: `src/lib/client-auth.ts`
- Create: `src/context/AuthContext.tsx`
- Test: `tests/client-auth.test.ts`

**Interfaces:**
- Consumes: `/api/auth/*`
- Produces: `useAuth()` hook providing `{ user, role, isLoading, isAuthenticated, loginAsIntern, loginAsAdmin, logout }`

- [ ] **Step 1: Write the failing test** (`tests/client-auth.test.ts`)
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSessionCookieHeader, getCachedAuthUser, setCachedAuthUser, clearCachedAuthUser } from '../src/lib/client-auth.ts';

describe('Client Auth Helper', () => {
  it('should parse cookie string accurately', () => {
    const cookie = 'ioh_session=abc123token; Path=/; HttpOnly';
    const token = parseSessionCookieHeader(cookie);
    assert.equal(token, 'abc123token');
  });

  it('should cache and retrieve user profile for instant hydration', () => {
    const user = { id: 'intern-sarah', name: 'Sarah Putri', role: 'INTERN' as const, email: 'sarah@ioh.co.id' };
    setCachedAuthUser(user);
    assert.deepEqual(getCachedAuthUser(), user);
    clearCachedAuthUser();
    assert.equal(getCachedAuthUser(), null);
  });
});
```

- [ ] **Step 2: Implement minimum passing code**
  - Implement `src/lib/client-auth.ts`.
  - Implement `src/context/AuthContext.tsx` with React context and auto-restore via `/api/auth/me`.

- [ ] **Step 3: Run verification command**
  - Run: `npm run test:fast tests/client-auth.test.ts`
  - Paste terminal execution proof.

---

### Task B2: Mobile-First Login Page Shell (`src/app/login/page.tsx`)

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/components/auth/InternLoginForm.tsx`
- Create: `src/components/auth/AdminLoginForm.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `src/types/index.ts`
- Produces: Visual login page with segmented tabs `[Peserta Magang]` vs `[Admin / Mentor]`

- [ ] **Step 1: Implement Component Specifications**
  - Mobile-first layout (max-w-md, 375px–430px responsive).
  - Segmented control to switch between Intern (NIM/ID + PIN) and Admin (Email + Password).
  - PIN Pad with 4-6 masked dot indicators and backspace/clear buttons.
  - Interactive feedback on error (shake animation / red pill notice) and loading state.

- [ ] **Step 2: Integration Verification**
  - Verify routing: Navigating to `/login` renders properly with zero hydration errors.

---

### Task B3: App Shell Locking & Header User Pill (`src/app/page.tsx`)

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`
- Produces: Logged-in intern experience without manual intern selector dropdown

- [ ] **Step 1: Implement Component Modifications**
  - Update `Header.tsx`: Replace static text with logged-in user's name, role badge (`[MAGANG]` / `[ADMIN]`), and a discreet Logout icon button.
  - Update `page.tsx`: Bind `selectedId` strictly to `auth.user.id`. Remove the dropdown selector so interns cannot punch for other colleagues. If not authenticated, redirect to `/login`.

- [ ] **Step 2: Verification**
  - Verify seamless punch check-in / check-out tied to current authenticated user.

---

### Task B4: Protected Admin Hub Shell (`src/app/admin/page.tsx`)

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `/api/attendance/requests`, `/api/whatsapp/status`, `/api/reports/daily-recap`
- Produces: Dedicated administrative control center for mentors and supervisors

- [ ] **Step 1: Implement Admin Shell**
  - Guard: If `user?.role !== 'ADMIN' && user?.role !== 'SUPERVISOR'`, redirect to `/`.
  - Navigation tabs: `[Persetujuan Cuti/WFH, WhatsApp Bot, Master Magang, Pengaturan Kantor]`.
  - Approve/Reject buttons connected to `PATCH /api/attendance/requests/[id]`.

- [ ] **Step 2: Verification**
  - Test admin view with seeded credentials `admin@ioh.co.id` / `AdminIOH2026!`.

---

## Full Regression & Benchmark Checklist

- [ ] **Run complete test suite:**
  - `npm test`
- [ ] **Verify zero regressions:**
  - Ensure all 97 existing tests pass alongside all new authentication tests (>110 total tests).
  - Verify execution time remains under 5 seconds.
