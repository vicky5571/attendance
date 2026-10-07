# Attendance PWA — Product & Technical Specification

## 1. Context & Objective
Build a complete, production-ready internal Attendance PWA (Progressive Web App) for interns in `/Users/mac/Web Development/indosat/attendance`.
Check-in and check-out MUST be strictly geofenced to the office coordinates. Daily logs and recaps must be automatically distributed via free WhatsApp automation (Baileys/WhatsApp-Web) and free SMTP email (Nodemailer).

---

## 2. Tech Stack (100% Free & Lightweight)
- **Framework:** Next.js (App Router, TypeScript) + Tailwind CSS + PWA (manifest, service worker, offline shell via `@ducanh2912/next-pwa` or `@serwist/next`)
- **Database & ORM:** SQLite via Prisma or Drizzle ORM (zero-cost, embedded, zero cloud dependency)
- **WhatsApp Gateway:** `@whiskeysockets/baileys` (100% free open-source; provides a QR-code pairing interface in an admin tab to link an official sender WhatsApp number)
- **Email Delivery:** Nodemailer configured with free Gmail SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
- **Scheduler:** Node-cron for daily summary generation and dispatch (e.g. 18:00 WIB daily)

---

## 3. Data Schema & Entities
1. **User / Intern Profile (`interns`):**
   - Full Name (`nama_lengkap`)
   - Division (`divisi`)
   - Mentor Name (`nama_mentor`)
   - Mentor Email (`email_mentor`)
   - University & Major (`universitas`, `jurusan`)
   - Internship End Date (`periode_magang_selesai`: Date)
   - Status (`ACTIVE` / `COMPLETED`)
2. **Attendance Log (`absensi`):**
   - Intern ID
   - Date (`YYYY-MM-DD`)
   - Check-In Time & Coordinates (`latitude`, `longitude`, `distance_in_meters`)
   - Check-Out Time & Coordinates
   - Status: `ON_TIME`, `LATE`, `EARLY_DEPARTURE`
   - Remarks: Automatically generated (e.g., "Terlambat 24 menit", "Pulang sebelum waktu kerja: lebih awal 45 menit", "Tepat Waktu")
3. **App Settings / Office Config (`office_config`):**
   - Office Coordinates: `TARGET_LATITUDE`, `TARGET_LONGITUDE`, `MAX_RADIUS_METERS` (default: 50m)
   - Working Hours: `WORK_START_TIME` (e.g. 08:30 WIB), `WORK_END_TIME` (e.g. 17:30 WIB)
   - Recipients: Supervisor Email (`EMAIL_ATASAN`), WhatsApp Group ID / JID for Daily Interns, WhatsApp Group ID / JID for Mentors.

---

## 4. Core Feature Requirements
1. **PWA Mobile-First Client (Branch `zacky` Scope):**
   - Installable on iOS (Safari "Add to Home Screen") and Android (Install prompt).
   - GPS Geolocation acquisition with high accuracy (`navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`).
   - Haversine distance validation against office coordinates: Block submission if user is outside allowed radius. Show clear UI distance indicator (e.g., "Anda berjarak 12m dari kantor - Memenuhi syarat").
   - Real-time time check to dynamically compute and display the auto-remark (Terlambat / Pulang Lebih Awal).
2. **WhatsApp Bot & Pairing Interface (Branch `vicky` Scope):**
   - Dedicated Admin page to initialize Baileys, view dynamic QR Code, and check WhatsApp connection status.
   - Message formatter for Daily Group Report:
     - Format: Date, list of interns who checked in/out, check-in time, and remarks (Terlambat / Pulang Awal).
   - Message formatter for Mentor WhatsApp Group Recap:
     - Per-division breakdown showing attendance rate and pending check-outs.
3. **Email Automated Recap (Branch `vicky` Scope):**
   - Generate HTML recap table containing intern profiles, hours worked, and remarks.
   - Send email via Nodemailer to:
     - Each individual `mentor_email` (filtered to their respective mentees).
     - Global supervisor email (`EMAIL_ATASAN`) containing all interns across all divisions.
4. **Admin Dashboard (Cross-Branch Integration):**
   - Manage intern data, office coordinates, working hours, and manual trigger buttons for test-sending WA & Email.

---

## 5. Constraints & Architectural Rules
- Do NOT use paid SaaS APIs (No Twilio, no paid WhatsApp vendors, no paid database).
- Store secrets and configuration in `.env.example` and `.env.local`.
- Validate coordinates on both client (for UX feedback) AND server (for tamper prevention).
- Ask before running destructive terminal commands or clearing database schemas.

---

## 6. Verification & Execution Flow
1. **Artifact First:** Create an implementation plan artifact in markdown detailing file structure, database schema, and delivery milestones. Wait for approval.
2. **Implementation:** Initialize project, setup database, build PWA UI, implement Geofencing calculation, configure Baileys & Nodemailer services.
3. **Testing & Verification:**
   - Verify Geolocation math with test unit cases (within radius vs outside radius).
   - Verify PWA manifest and icons using responsive mobile viewport (375px).
   - Verify WhatsApp QR pairing route and Nodemailer mock/transporter response.
