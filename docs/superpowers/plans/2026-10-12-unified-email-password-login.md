# Unified Email & Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Indosat Attendance PWA authentication system to a unified **Corporate Email + Password** mechanism for both Interns and Administrators/Mentors, eliminating the public intern dropdown list and roster exposure on `/login` while preserving physical attendance anti-proxy verification.

**Architecture:**
- **Unified Identity Model:** Both interns and administrative staff authenticate using standard corporate credentials (`email` + `password`).
- **Database Schema Migration:** Extend the SQLite `interns` table with `email` and `password_hash` columns with idempotent migrations in `src/lib/db/schema.ts`.
- **Flexible Backend Resolver:** `POST /api/auth/login` checks both `users` (`ADMIN` / `SUPERVISOR`) and `interns` (`INTERN`) against salted scrypt/SHA-256 password hashes, issuing an HTTP-only `ioh_session` cookie while preserving backward-compatible support for legacy payload contracts.
- **Unified Mobile-First Frontend:** A single, sleek corporate login card on `/login` requiring email and password, automatically routing interns to `/` (Presensi) and admins/mentors to `/admin` (Dashboard).

**Tech Stack:** Next.js 16.4.0 (App Router), React 19.3.0, TypeScript, SQLite (`node:sqlite`), Node.js `node:crypto`, Node.js native test runner (`node:test`).

**Spec Reference:** [`docs/superpowers/specs/attendance-pwa-spec.md`](../specs/attendance-pwa-spec.md)  
**Architecture Invariants:** [`docs/architecture-system-invariants.md`](../../architecture-system-invariants.md)

---

## Global Constraints

1. **Strict Branch Bifurcation:**
   - **Track A:** `[BACKEND / branch: vicky]` — Schema migration, seed credentials, repository queries, and unified `POST /api/auth/login`.
   - **Track B:** `[FRONTEND / branch: zacky]` — Client auth helpers, AuthContext methods, and unified `/login` UI.
2. **SSOT Rule:** All domain types and login payloads must reside in [`src/types/index.ts`](../../src/types/index.ts). No duplicate interfaces.
3. **Zero Heavy Dependencies:** Standard Node.js `node:crypto` and `node:sqlite` only. No external auth library additions.
4. **File Size Limit:** Keep all modified files modular and under 250 lines.
5. **Strict 3-Step Execution Loop:**
   - `Step 1: Write the failing test`
   - `Step 2: Implement minimum passing code`
   - `Step 3: Run verification command (npm run test:fast <path>) and paste terminal proof`

---

## File Structure Diff

```text
Modify:
- src/types/index.ts                         (Add email, passwordHash to InternProfile; add UnifiedLoginPayload)
- src/lib/db/schema.ts                       (Add email and password_hash columns to interns with schema migrations)
- src/lib/db/repo.ts                         (Add getInternByEmail helper and update createIntern/mapIntern)
- src/lib/db/seed.ts                         (Seed default intern emails and hashed passwords)
- src/app/api/auth/login/route.ts            (Unified email + password resolver across users & interns)
- src/lib/client-auth.ts                     (Add unified login function)
- src/context/AuthContext.tsx                (Expose unified login method)
- src/app/login/page.tsx                     (Single clean email + password form; remove dropdown & keypad)

Test Files:
- tests/auth-schema.test.ts                  (Verify email and password_hash columns on interns)
- tests/api-auth.test.ts                     (Verify unified email/password login for intern and admin)
```

---

## Implementation Tasks

### Track A: Backend (`branch: vicky`)

---

### Task 1: Schema Migration & Types for Intern Email & Password (`[BACKEND / branch: vicky]`)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/repo.ts`
- Test: `tests/auth-schema.test.ts`

**Interfaces:**
- `InternProfile`: add `email?: string; passwordHash?: string;`
- `getInternByEmail(db: DatabaseSync, email: string): InternProfile | null`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/auth-schema.test.ts (add test block)
it('should support email and password_hash columns on interns table', () => {
  const db = createDatabase(':memory:');
  initSchema(db);
  const row = db.prepare(`
    INSERT INTO interns (id, nama_lengkap, email, password_hash, divisi, nama_mentor, email_mentor, universitas, jurusan, periode_magang_selesai, status)
    VALUES ('intern-test', 'Test Intern', 'test@ioh.co.id', 'hash123', 'Div', 'Mentor', 'mentor@ioh.co.id', 'Univ', 'Maj', '2026-12-31', 'ACTIVE')
    RETURNING id, email, password_hash
  `).get() as { id: string; email: string; password_hash: string };

  assert.equal(row.email, 'test@ioh.co.id');
  assert.equal(row.password_hash, 'hash123');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/auth-schema.test.ts`  
Expected: FAIL (column email / password_hash does not exist).

- [ ] **Step 3: Implement minimal passing code**

1. In `src/types/index.ts`, add `email?: string; passwordHash?: string;` to `InternProfile`.
2. In `src/lib/db/schema.ts`:
   - Add `email TEXT UNIQUE` and `password_hash TEXT` to `SCHEMA_SQL` table definition.
   - Add idempotent `ALTER TABLE interns ADD COLUMN email TEXT;` and `ALTER TABLE interns ADD COLUMN password_hash TEXT;` in `initSchema`.
3. In `src/lib/db/repo.ts`:
   - Map `email: row.email || undefined` and `passwordHash: row.password_hash || undefined` in `mapIntern`.
   - Add `getInternByEmail(db, email)` helper.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/auth-schema.test.ts`  
Expected: PASS with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/db/schema.ts src/lib/db/repo.ts tests/auth-schema.test.ts
git commit -m "feat(auth): add email and password hash columns to interns table"
```

---

### Task 2: Seed Default Intern Corporate Credentials (`[BACKEND / branch: vicky]`)

**Files:**
- Modify: `src/lib/db/seed.ts`
- Test: `tests/seed.test.ts`

**Interfaces:**
- Intern credentials:
  - `sarah@ioh.co.id` / `InternIOH2026!`
  - `zacky@ioh.co.id` / `InternIOH2026!`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/seed.test.ts
it('should seed default interns with valid corporate email and password hashes', () => {
  const db = createDatabase(':memory:');
  initSchema(db);
  seedDatabase(db);

  const sarah = getIntern(db, 'intern-sarah');
  assert.ok(sarah);
  assert.equal(sarah.email, 'sarah@ioh.co.id');
  assert.ok(sarah.passwordHash);
  assert.ok(verifyPassword('InternIOH2026!', sarah.passwordHash));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/seed.test.ts`  
Expected: FAIL (`sarah.email` is undefined).

- [ ] **Step 3: Implement minimal passing code**

In `src/lib/db/seed.ts`:
- Update `INITIAL_INTERNS` items with:
  - `intern-zacky`: `email: 'zacky@ioh.co.id'`, `passwordHash: hashPassword('InternIOH2026!')`
  - `intern-sarah`: `email: 'sarah@ioh.co.id'`, `passwordHash: hashPassword('InternIOH2026!')`
- Update `createIntern` statements to persist `email` and `password_hash`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/seed.test.ts`  
Expected: PASS with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/seed.ts tests/seed.test.ts
git commit -m "feat(auth): seed default corporate email and password for interns"
```

---

### Task 3: Unified Email + Password Login API (`[BACKEND / branch: vicky]`)

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/types/index.ts`
- Test: `tests/api-auth.test.ts`

**Interfaces:**
- Request body: `{ email: string, password: string }` (or legacy `{ role, internId, pin }`)
- Response: `200 OK` `{ user: { id, name, email, role, divisi }, message: 'Login berhasil' }` + `ioh_session` cookie

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api-auth.test.ts (add test cases)
it('should authenticate intern with valid email and password via unified login', async () => {
  const req = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@ioh.co.id', password: 'InternIOH2026!' }),
  });
  const res = await loginRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.user.role, 'INTERN');
  assert.equal(data.user.id, 'intern-sarah');
  assert.equal(data.user.email, 'sarah@ioh.co.id');
  assert.ok(res.headers.get('set-cookie')?.includes('ioh_session='));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:fast tests/api-auth.test.ts`  
Expected: FAIL (`Field "role" wajib diisi`).

- [ ] **Step 3: Implement minimal passing code**

In `src/app/api/auth/login/route.ts`:
1. If payload contains `email` and `password`:
   - First query `getUserByEmail(db, email)`: if exists and `verifyPassword(password, user.passwordHash)` succeeds, create session with `role: user.role`, `userId: user.id`.
   - Next query `getInternByEmail(db, email)`: if exists and `intern.passwordHash && verifyPassword(password, intern.passwordHash)` succeeds, create session with `role: 'INTERN'`, `userId: intern.id`.
   - If neither matches: return `401 Unauthorized` with `{ error: 'Email atau password yang dimasukkan salah' }`.
2. Keep legacy support for `body.role === 'INTERN'` with `internId` + `pin` for backward compatibility.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast tests/api-auth.test.ts`  
Expected: PASS with 0 failures across all login modes.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/login/route.ts src/types/index.ts tests/api-auth.test.ts
git commit -m "feat(auth): support unified email and password authentication"
```

---

### Track B: Frontend (`branch: zacky`)

---

### Task 4: Client Auth Helper & Context Integration (`[FRONTEND / branch: zacky]`)

**Files:**
- Modify: `src/lib/client-auth.ts`
- Modify: `src/context/AuthContext.tsx`
- Test: manual integration & `npx tsc --noEmit`

**Interfaces:**
- `login(email: string, password: string): Promise<{ success: boolean; error?: string }>` in `useAuth()`

- [ ] **Step 1: Write the failing type check**

In `src/context/AuthContext.tsx`, reference `login` function.

- [ ] **Step 2: Implement minimal passing code**

1. In `src/lib/client-auth.ts`, add:
   ```typescript
   export async function loginWithCredentials(email: string, password: string): Promise<AuthResponse> {
     const res = await fetch('/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, password }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || 'Login gagal');
     return data as AuthResponse;
   }
   ```
2. In `src/context/AuthContext.tsx`:
   - Add `login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>` to `AuthContextType`.
   - Implement `login` calling `loginWithCredentials`.

- [ ] **Step 3: Run verification command**

Run: `npx tsc --noEmit`  
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/client-auth.ts src/context/AuthContext.tsx
git commit -m "feat(auth): expose unified login method in AuthContext"
```

---

### Task 5: Unified Corporate `/login` Page (`[FRONTEND / branch: zacky]`)

**Files:**
- Modify: `src/app/login/page.tsx`
- Create/Modify: `src/components/auth/UnifiedLoginForm.tsx`
- Modify: `docs/frontend-login-handover.md`

- [ ] **Step 1: Build UnifiedLoginForm Component**

Create `src/components/auth/UnifiedLoginForm.tsx`:
- Mobile-first responsive card design (375px–430px).
- Input: **Email Perusahaan / Universitas** (`type="email"`).
- Input: **Password** (`type="password"` with show/hide toggle icon).
- Submit button with spinner loading state.
- Error banner for invalid credentials.
- Hint text showing pre-seeded dev credentials (`sarah@ioh.co.id` / `admin@ioh.co.id`).

- [ ] **Step 2: Update `/login/page.tsx`**

- Remove the intern vs admin tab switcher and remove the intern dropdown.
- Render `<UnifiedLoginForm />`.
- Maintain automatic redirect: Interns to `/`, Admins/Mentors to `/admin`.

- [ ] **Step 3: Run verification command**

Run: `npx tsc --noEmit && npm test`  
Expected: PASS with 0 errors and all tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/components/auth/UnifiedLoginForm.tsx docs/frontend-login-handover.md
git commit -m "feat(auth): implement unified corporate email and password login page"
```

---

## Verification & Acceptance Criteria

1. **Intern Login**: Visiting `/login`, typing `sarah@ioh.co.id` and `InternIOH2026!` logs in successfully and redirects to `/` (Presensi).
2. **Admin Login**: Typing `admin@ioh.co.id` and `AdminIOH2026!` logs in successfully and redirects to `/admin` (Dashboard).
3. **Zero Roster Leakage**: Unauthenticated visitors cannot see any intern names, IDs, or divisions on `/login`.
4. **All Tests Pass**: `npm test` executes all test suites with 0 failures under 1 second.
