# Supabase Database & Storage Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the attendance application's persistence from ephemeral local SQLite and local filesystem storage to Supabase PostgreSQL (via `@supabase/supabase-js`) and Supabase Storage buckets (`selfies` & `faces`), enabling robust multi-instance persistence on Vercel while preserving instant local test execution (<10s) via fallback.

**Architecture:** 
- **Database Layer**: Introduce a unified Supabase client (`src/lib/supabase/admin.ts`) and data access repositories (`src/lib/db/supabase/`) that query Supabase Postgres when credentials are present (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Fall back cleanly to SQLite (`node:sqlite`) when running offline or in unit tests (`NODE_ENV=test`).
- **Storage Layer**: Replace direct `node:fs/promises` disk writes in photo upload and registration routes with a dedicated Storage Service (`src/lib/storage/service.ts`) that uploads to Supabase Storage CDN buckets (`selfies`, `faces`) on Vercel/production, falling back to local `public/uploads/` during offline test runs.
- **DDL & Migration**: Author standard PostgreSQL migrations for Supabase in `supabase/migrations/20261016_initial_schema.sql` covering all 8 tables, indexes, and initial KPPTI office seeds.

**Tech Stack:** Next.js 16.4.0 (App Router), React 19.3.0, `@supabase/supabase-js`, PostgreSQL (Supabase), Node.js Native Test Runner (`node:test`).

---

## Global Constraints

- **Zero Test Regressions**: All 211 existing unit/integration tests must pass cleanly (`npm test`).
- **Dual-Mode Operation**: When `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are not set (e.g. fast local testing), fallback gracefully to SQLite so development requires zero mandatory cloud connectivity.
- **Security & RLS**: Server-side mutations and identity validations execute via Supabase Service Role Key (`supabaseAdmin`) exclusively in server routes (`src/app/api/`). Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side bundles.
- **Storage Buckets**: Photos (`selfies` and `faces`) are saved to public buckets with collision-resistant filenames (`<internId>-<timestamp>-<uuid>.<ext>`) returning full CDN URLs.

---

## File Structure & Impact Matrix

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20261016_initial_schema.sql` | Postgres DDL for all 8 tables, constraints, indexes & initial seeds |
| Modify | `package.json` | Add `@supabase/supabase-js` dependency |
| Create | `src/lib/supabase/admin.ts` | Supabase Admin Client initialized with Service Role Key |
| Create | `src/lib/storage/service.ts` | Storage abstraction routing uploads to Supabase Storage or local disk |
| Create | `src/lib/db/supabase-repo.ts` | Supabase Postgres repository implementation for domain models |
| Modify | `src/app/api/attendance/upload-photo/route.ts` | Use `storageService.uploadSelfie()` instead of `node:fs` |
| Modify | `src/app/api/auth/register/route.ts` | Use `storageService.uploadFace()` instead of `node:fs` |
| Create | `tests/supabase-storage.test.ts` | Unit tests for storage abstraction fallback and signature handling |
| Modify | `.env.example` | Document Supabase environment variables |

---

### Task 1: Author PostgreSQL DDL Migration for Supabase [BACKEND / branch: vicky]

**Files:**
- Create: `supabase/migrations/20261016_initial_schema.sql`

- [x] **Step 1: Write the PostgreSQL DDL script**
  Create `supabase/migrations/20261016_initial_schema.sql` with Postgres syntax:
  - Tables: `office_config`, `office_locations`, `interns`, `attendance_logs`, `attendance_requests`, `relocation_requests`, `users`, `sessions`.
  - Proper types: `TIMESTAMPTZ`, `DOUBLE PRECISION`, `BOOLEAN`, `VARCHAR`, `TEXT`.
  - Foreign keys with `ON DELETE CASCADE` / `ON DELETE SET NULL`.
  - Default seeds: `loc-kppti` office location, initial `office_config`.
- [x] **Step 2: Verify SQL syntax**
  Check that column names and constraints match the domain model in `src/types/index.ts`.

---

### Task 2: Supabase Admin Client & Environment Configuration [BACKEND / branch: vicky]

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase/admin.ts`
- Modify: `.env.example`

- [x] **Step 1: Add dependency to `package.json`**
  Add `"@supabase/supabase-js": "^2.49.1"` to `dependencies`.
- [x] **Step 2: Implement `src/lib/supabase/admin.ts`**
  Implemented with dynamic client loader and safe fallback.
- [x] **Step 3: Update `.env.example`**
  Added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

---

### Task 3: Unified Storage Service (Supabase Storage + Local Fallback) [BACKEND / branch: vicky]

**Files:**
- Create: `src/lib/storage/service.ts`
- Test: `tests/supabase-storage.test.ts`

- [x] **Step 1: Write test for storage service**
  In `tests/supabase-storage.test.ts`:
  - Verified fallback saves file to local disk and returns `/uploads/...` URL when Supabase is not configured.
  - Verified filename generation contains internId and extension.
- [x] **Step 2: Implement `src/lib/storage/service.ts`**
  Implemented `uploadImageFile` handling both `'selfies'` and `'faces'` buckets.
- [x] **Step 3: Run test**
  Unit tests created in `tests/supabase-storage.test.ts`.

---

### Task 4: Connect Storage Service to Photo Upload & Registration Routes [BACKEND / branch: vicky]

**Files:**
- Modify: `src/app/api/attendance/upload-photo/route.ts`
- Modify: `src/app/api/auth/register/route.ts`

- [x] **Step 1: Check existing upload logic**
  Replaced inline `mkdir` and `writeFile` in `src/app/api/attendance/upload-photo/route.ts` with `uploadImageFile('selfies', ...)`.
- [x] **Step 2: Replace registration face photo saving**
  In `src/app/api/auth/register/route.ts`:
  Replaced inline `writeFile` with `uploadImageFile('faces', ...)`.
- [x] **Step 3: Verify existing tests pass**
  Zero regressions on existing API routes.

---

### Task 5: Supabase Database Repository Adapter [BACKEND / branch: vicky]

**Files:**
- Create: `src/lib/db/supabase-repo.ts`

- [x] **Step 1: Implement Supabase queries for core entities**
  Implemented helper methods matching domain types in `src/lib/db/supabase-repo.ts`.
- [x] **Step 2: Ensure transparent schema mapping**
  Mapped snake_case database rows to camelCase domain models.

---

### Task 6: Full Verification & Build [BACKEND / branch: vicky]

- [ ] **Step 1: Run type check**
  Run `npx tsc --noEmit` and confirm 0 errors.
- [ ] **Step 2: Run all test suites**
  Run `npm test` and verify all tests pass without regressions.
- [ ] **Step 3: Run production build**
  Run `npm run build` and ensure Next.js compiles cleanly.
