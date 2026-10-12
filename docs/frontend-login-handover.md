# Frontend Handover: Role-Based Login & Session System

**Date:** 2026-10-12  
**Target Branch:** `zacky` (`FRONT-END SPECIALIST`)  
**Backend Baseline:** Branch `vicky` / `main` (Commit `905ad4e`, 118/118 passing tests)  
**Specification Reference:** [`docs/superpowers/plans/2026-10-12-role-based-login-system.md`](superpowers/plans/2026-10-12-role-based-login-system.md)

---

## 1. Overview & Architecture

The backend authentication, password hashing, SQLite session management, and server-side route guards are **100% completed and deployed to `main`**.

The frontend now needs to implement the client-side authentication shell:
1. `useAuth()` Context Provider for global user state and automatic session hydration.
2. Mobile-first `/login` page with dual tabs (Intern numeric PIN pad vs Admin password).
3. Lock the punch attendance screen (`/`) strictly to `auth.user.id` (eliminating dropdown impersonation / *Anti-Jastip Absen*).
4. Guarded Administrative Dashboard (`/admin`) for supervisors/mentors.

---

## 2. Active Backend Endpoints & API Contracts

All endpoints use standard JSON payloads and manage sessions via an **HTTP-only, SameSite=Lax cookie** named `ioh_session` (7 days duration).

### 2.1 `POST /api/auth/login`
Authenticates a user and sets the `ioh_session` cookie automatically.

* **Mode A: Intern Login (NIM/ID + PIN)**
  ```json
  // Request
  POST /api/auth/login
  Content-Type: application/json

  {
    "role": "INTERN",
    "internId": "intern-sarah",
    "pin": "123456"
  }

  // Response (200 OK)
  {
    "message": "Login berhasil",
    "user": {
      "id": "intern-sarah",
      "name": "Sarah Nurhaliza",
      "role": "INTERN",
      "divisi": "Network Operations"
    }
  }
  ```

* **Mode B: Admin / Mentor Login (Email + Password)**
  ```json
  // Request
  POST /api/auth/login
  Content-Type: application/json

  {
    "role": "ADMIN",
    "email": "admin@ioh.co.id",
    "password": "AdminIOH2026!"
  }

  // Response (200 OK)
  {
    "message": "Login berhasil",
    "user": {
      "id": "user-admin-default",
      "name": "Administrator IOH",
      "email": "admin@ioh.co.id",
      "role": "ADMIN"
    }
  }
  ```

* **Error Responses:**
  * `401 Unauthorized`: `{ "error": "PIN yang dimasukkan salah" }` or `{ "error": "Email atau password yang dimasukkan salah" }`
  * `404 Not Found`: `{ "error": "Peserta magang dengan ID '...' tidak ditemukan" }`
  * `400 Bad Request`: Missing required fields.

---

### 2.2 `GET /api/auth/me`
Retrieves currently authenticated session profile. The browser automatically includes the `ioh_session` cookie.

* **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "intern-sarah",
      "name": "Sarah Nurhaliza",
      "role": "INTERN",
      "divisi": "Network Operations",
      "namaMentor": "Budi Santoso",
      "emailMentor": "budi.santoso@indosat.com"
    }
  }
  ```
* **Response (401 Unauthorized):**
  ```json
  { "error": "Tidak terautentikasi (cookie sesi tidak ditemukan)" }
  ```

---

### 2.3 `POST /api/auth/logout`
Revokes the session in SQLite and clears the `ioh_session` cookie (`Max-Age=0`).

* **Response (200 OK):**
  ```json
  { "message": "Berhasil keluar dari sistem" }
  ```

---

## 3. Pre-Seeded Development Credentials

| Role | Username / ID | Email | Password | Punch PIN |
| :--- | :--- | :--- | :--- | :--- |
| **Intern** | `intern-sarah` | `sarah@ioh.co.id` | **`InternIOH2026!`** | `123456` |
| **Intern** | `intern-zacky` | `zacky@ioh.co.id` | **`InternIOH2026!`** | `123456` |
| **Admin** | `admin` | `admin@ioh.co.id` | **`AdminIOH2026!`** | N/A |

---

## 4. Frontend Jobdesk Checklist (`branch: zacky`)

### 📋 Task B1: Client Auth Helper & Context Provider
- [ ] Create `src/lib/client-auth.ts`:
  - Functions: `loginIntern(id, pin)`, `loginAdmin(email, pass)`, `fetchCurrentUser()`, `logoutUser()`.
- [ ] Create `src/context/AuthContext.tsx`:
  - Hook `useAuth()` exposing:
    ```typescript
    {
      user: AuthResponseUser | null;
      role: 'INTERN' | 'ADMIN' | 'SUPERVISOR' | null;
      isLoading: boolean;
      isAuthenticated: boolean;
      loginAsIntern: (internId: string, pin: string) => Promise<boolean>;
      loginAsAdmin: (email: string, password: string) => Promise<boolean>;
      logout: () => Promise<void>;
    }
    ```
  - Mount hook: Fetch `/api/auth/me` on initial load.
- [x] Wrap app root with `<AuthProvider>` in `src/app/layout.tsx`.

---

### 📋 Task B2: Mobile-First `/login` Page
- [ ] Create `src/app/login/page.tsx`:
  - Mobile-first responsive card (375px–430px viewport).
  - IOH Brand Aesthetic (Logo multi-circle SVG, `#ED0278` magenta accents, `#ED1C24` red).
  - Segmented tab control: `[Peserta Magang]` vs `[Admin / Mentor]`.
- [ ] Component `src/components/auth/InternLoginForm.tsx`:
  - Dropdown or text input for Intern ID / Name.
  - Interactive 4-6 digit numeric PIN pad with masked dot indicators, delete key, and shake animation on incorrect PIN.
- [ ] Component `src/components/auth/AdminLoginForm.tsx`:
  - Email & Password input fields with show/hide password toggle.
  - Submit button with spinner loading state.
- [ ] Post-login redirect:
  - If role is `INTERN` ➔ redirect to `/` (Presensi).
  - If role is `ADMIN` or `SUPERVISOR` ➔ redirect to `/admin`.

---

### 📋 Task B3: Lock Home Punching & Update Header
- [ ] Update `src/app/page.tsx`:
  - Replace the manual `selectedId` dropdown selector with the logged-in intern: `auth.user.id`.
  - If unauthenticated, redirect to `/login`.
  - Pass the authenticated intern profile directly to `<ProfileCard>` and `<AttendanceActions>`.
- [ ] Update `src/components/Header.tsx`:
  - Display authenticated user name and badge pill (`[MAGANG]` or `[ADMIN]`).
  - Add a Logout button calling `auth.logout()` with confirmation.

---

### 📋 Task B4: Dedicated Admin Dashboard (`/admin`)
- [ ] Create `src/app/admin/layout.tsx` & `src/app/admin/page.tsx`:
  - Route guard: If `role !== 'ADMIN' && role !== 'SUPERVISOR'`, redirect to `/`.
  - Quick action buttons:
    - View pending leave requests (integrate `<MentorApprovalModal>`).
    - Trigger daily WhatsApp recap manually (`/api/reports/daily-recap`).
    - Pair WhatsApp QR code (integrate `<WhatsAppModal>`).
    - Export monthly attendance report CSV (`/api/reports/monthly-export`).

---

## 5. Security & Boundary Invariants for Frontend

1. **Anti-Proxy Punch Enforcement:** The backend now rejects check-in/check-out with `403 Forbidden` if an intern session attempts to send a mismatched `internId`. Do not allow switching intern ID once logged in.
2. **Zero Plaintext Credentials in LocalStorage:** Only cache non-sensitive user metadata (`id`, `name`, `role`, `divisi`). Session cookies (`ioh_session`) are managed automatically by the browser via `HttpOnly`.
3. **Execution Latency & Quality:** Keep bundle lightweight using native React hooks and Tailwind CSS v4. Run `npx tsc --noEmit` to verify type integrity before committing.
