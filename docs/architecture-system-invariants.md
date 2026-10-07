# Architecture & System Invariants

## 1. System Overview & Invariants
- **Runtime & Environment:** Node.js v26.8.1 (native ESM).
- **Core Framework:** Next.js 16.4.0 (App Router), React 19.3.0.
- **Styling Layer:** Tailwind CSS v4 via `@tailwindcss/turbopack`.
- **SSOT Type Definitions:** `src/types/index.ts`. All interfaces across client views, server API handlers, and test fixtures MUST derive from here.
- **Test Harness:** Native Node.js test runner (`node:test` via `npm run test:fast`). Execution latency < 300ms.

### Branch Architecture & Ownership Model
| Branch | Owner / Role | Responsibility Domain | Key File Paths |
| :--- | :--- | :--- | :--- |
| **`zacky`** | Front-End Specialist | Mobile PWA UI, Geolocation Client UX, Offline Cache, Radars, Camera Capture | `src/app/**/page.tsx`, `src/components/**`, `public/manifest.json` |
| **`vicky`** | Back-End Specialist | Database Models, API Handlers, Baileys WhatsApp Service, Nodemailer SMTP, Cron | `src/app/api/**`, `src/lib/db/**`, `src/lib/services/**` |
| **`main`** | Release / Coordinator | End-to-end integration, release builds, and CI verification | Root & documentation |

---

## 2. Entity & Data Scoping Matrix

| Entity | Storage Level | Scope Boundary | Lifecycle & Cascade Rules | SSOT Type |
| :--- | :--- | :--- | :--- | :--- |
| **`OfficeConfig`** | Global Master | Unscoped (Global Office) | Singleton record. Contains geofence coordinates (`lat`, `lng`, `radius`) and working hours. | `OfficeConfig` in `src/types/index.ts` |
| **`InternProfile`** | Master Data | Scoped by Division / Mentor | Master record for interns (`namaLengkap`, `divisi`, `namaMentor`, `emailMentor`, `universitas`, `jurusan`, `periodeMagangSelesai`). | `InternProfile` in `src/types/index.ts` |
| **`AttendanceRecord`** | Operational Log | Scoped by Intern & Date (`internId` + `date`) | Unique constraint on `[internId, date]`. Check-in & check-out times, GPS coordinates, distance, status (`ON_TIME`, `LATE`, `EARLY_DEPARTURE`), and auto-generated remarks. | `AttendanceRecord` in `src/types/index.ts` |
| **`WhatsAppSession`** | System Runtime | Server Local Storage | Baileys auth credentials & multidevice session keys. Never committed to git. | Server internal |

---

## 3. Persistence & Sync Architecture
1. **Client-Side Hydration & Geolocation:**
   - Client requests high-accuracy coordinates via `navigator.geolocation.getCurrentPosition`.
   - Client performs instant client-side Haversine calculation (`src/lib/geo.ts`) to provide live UI feedback (distance to office & eligibility).
2. **Server-Side Anti-Spoofing & Atomic Transaction:**
   - POST to `/api/attendance/check-in` sends client timestamp and coordinates.
   - Server re-calculates distance against `OfficeConfig` using server-side Haversine formula. Rejects if distance > `maxRadiusMeters`.
   - Computes automated remarks (`evaluateAttendanceRemarks`) on the server.
   - Writes to SQLite transactionally.
3. **Dispatch & Notification Pipelines:**
   - **Daily Broadcast (18:00 WIB Cron):** Node-cron aggregates all `AttendanceRecord` entries for the current date.
   - **WhatsApp Channel:** Dispatches summary message to the Interns Group and division breakdown to the Mentors Group via Baileys socket.
   - **Email Channel:** Renders responsive HTML table and sends to `emailMentor` and global `emailAtasan` via Nodemailer.
