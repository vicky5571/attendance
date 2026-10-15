# Frontend Handover: Intern Registration System & Biometric Face Reference

**Date:** 2026-10-15  
**Target Branch:** `zacky` (`FRONT-END SPECIALIST`)  
**Backend Baseline:** Branch `vicky` (197/197 passing tests)  
**Implementation Plan Reference:** [`docs/superpowers/plans/2026-10-15-intern-registration-face-verification.md`](superpowers/plans/2026-10-15-intern-registration-face-verification.md)  
**Technical Spec Reference:** [`docs/superpowers/specs/2026-10-15-intern-registration-face-verification-design.md`](superpowers/specs/2026-10-15-intern-registration-face-verification-design.md)  

---

## 1. Executive Summary

The backend team on branch `vicky` has implemented and verified the complete intern registration system:
1. **Biometric Face Detection Engine (`src/lib/services/face-detection.ts`)**:
   - Analyzes uploaded photos using `sharp` to verify the presence of a real human face (YCbCr Kovac et al. chromatic skin tone clustering and facial contrast variance).
   - Rejects blank photos, solid colors, drawings, and non-face scenery with `422 Unprocessable Entity`.
2. **Registration API (`POST /api/auth/register`)**:
   - Validates all intern profile fields, enforces 6-digit numeric PINs, validates uniqueness of email, and hashes credentials using `scrypt` and `sha256`.
   - Persists the validated reference face photo to `/public/uploads/faces/<internId>-face-<timestamp>.jpg` and sets `interns.photo_url`.
3. **Isolated Raw HTML/CSS Registration Page (`src/app/register/page.tsx`)**:
   - Available immediately at route `/register`.
   - Built with raw semantic HTML and scoped vanilla CSS so that **zero frontend PWA / Tailwind components were touched or disturbed**.
   - Includes live webcam stream capture with offscreen canvas snapshot and fallback file picker (`<input type="file" accept="image/*">`).

---

## 2. API Contract: `POST /api/auth/register`

* **Endpoint:** `POST /api/auth/register`
* **Content-Type:** `application/json`
* **Request Body (`InternRegistrationPayload`):**
  ```json
  {
    "namaLengkap": "Dimas Wicaksono",
    "email": "dimas.wicaksono@ioh.co.id",
    "password": "SecurePassword2026!",
    "pin": "654321",
    "divisi": "Cloud Infrastructure",
    "namaMentor": "Vicky Backend Lead",
    "emailMentor": "mentor.vicky@indosat.com",
    "universitas": "Institut Teknologi Bandung",
    "jurusan": "Teknik Komputer",
    "periodeMagangSelesai": "2026-12-31",
    "assignedLocationId": "loc-kppti",
    "facePhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
  ```

* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Registrasi berhasil",
    "intern": {
      "id": "intern-a1b2c3d4",
      "namaLengkap": "Dimas Wicaksono",
      "email": "dimas.wicaksono@ioh.co.id",
      "divisi": "Cloud Infrastructure",
      "namaMentor": "Vicky Backend Lead",
      "emailMentor": "mentor.vicky@indosat.com",
      "universitas": "Institut Teknologi Bandung",
      "jurusan": "Teknik Komputer",
      "periodeMagangSelesai": "2026-12-31",
      "status": "ACTIVE",
      "assignedLocationId": "loc-kppti",
      "photoUrl": "/uploads/faces/intern-a1b2c3d4-face-1729000000000-e5f6g7.jpg"
    }
  }
  ```

* **Error Responses:**
  * `400 Bad Request`: Missing mandatory fields, invalid email format, invalid 6-digit PIN, or file size > 3MB.
  * `409 Conflict`: Email is already registered (`Email '...' sudah terdaftar dalam sistem`).
  * `422 Unprocessable Entity`: No human face detected in the photo (`Tidak terdeteksi wajah manusia pada foto yang diunggah. Pastikan wajah terlihat jelas dan menghadap kamera.`).

---

## 3. How Check-In & Check-Out Use the Saved Face

1. When a new intern registers, their validated face image is permanently saved to disk and recorded as their baseline reference photo: `interns.photo_url`.
2. When the intern logs in (`POST /api/auth/login`) or launches the app (`GET /api/auth/me`), their `photoUrl` is immediately returned in the session.
3. During check-in (`POST /api/attendance/check-in`) and check-out (`POST /api/attendance/check-out`), the selfie captured by the intern is logged in `attendance_logs.photo_url` / `attendance_logs.check_out_photo_url`, enabling supervisors and mentors to visually compare and verify attendance punches against the registered face photo.

---

## 4. Frontend Jobdesk Integration Options (for Branch `zacky`)

The raw HTML/CSS form at `/register` is completely functional right now. When the frontend team (`zacky`) is ready to style this page into the mobile PWA theme:
- The form fields, state hooks, and API fetch calls can be seamlessly wrapped into a styled Tailwind component matching the mobile design tokens.
- Add a "Daftar Akun Baru" link on `src/app/login/page.tsx` pointing to `/register`.
