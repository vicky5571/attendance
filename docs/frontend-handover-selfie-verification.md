# Frontend Handover: Selfie Verification & Profile Photo Auto-Restoration

**Date:** 2026-10-14  
**Target Branch:** `zacky` (`FRONT-END SPECIALIST`)  
**Backend Baseline:** Branch `vicky` (Commit `afdc3e3`, 185/185 passing tests)  
**Implementation Plan Reference:** [`docs/superpowers/plans/2026-10-14-selfie-verification-and-profile-photo.md`](superpowers/plans/2026-10-14-selfie-verification-and-profile-photo.md)

---

## 1. Executive Summary

The backend team has deployed complete persistence, validation, and auto-synchronization infrastructure for **Selfie Verification** on branch `vicky`:

1. **Selfie Upload API (`POST /api/attendance/upload-photo`)**:
   - Accepts Base64 encoded images (Data URI or raw Base64 string).
   - Validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and enforces a 3MB payload limit.
   - Saves to public directory `public/uploads/selfies/<internId>-<timestamp>-<uuid>.<ext>` and serves via public URL path `/uploads/selfies/...`.
   - Protected with `enforceInternIdentity` (intern can only upload photos for their own account).

2. **Check-In & Check-Out Endpoints with Auto-Restoration**:
   - `POST /api/attendance/check-in` accepts `photoUrl`.
   - `POST /api/attendance/check-out` accepts `photoUrl` or `checkOutPhotoUrl`.
   - **Automatic Profile Restoration**: Whenever a check-in or check-out is recorded with a verified photo, the backend automatically updates `interns.photo_url` with the latest verified selfie.

3. **Session Hydration (`GET /api/auth/me`)**:
   - Returns `photoUrl` in the `user` payload for authenticated intern sessions, allowing instant profile picture display upon app launch.

---

## 2. Active Backend Endpoints & API Contracts

### 2.1 Upload Selfie (`POST /api/attendance/upload-photo`)

Uploads a captured camera frame as a Base64 string and returns the stored public photo URL.

* **Endpoint:** `POST /api/attendance/upload-photo`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "internId": "intern-sarah",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
    "type": "CHECK_IN"
  }
  ```
  *(Note: `type` can be `"CHECK_IN"`, `"CHECK_OUT"`, or `"PROFILE"`, optional)*
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Foto selfie berhasil diunggah",
    "photoUrl": "/uploads/selfies/intern-sarah-1728938400000-a1b2c3d4.jpg",
    "size": 184520,
    "mimeType": "image/jpeg"
  }
  ```
* **Error Responses:**
  * `400 Bad Request`: `Field internId dan image wajib diisi`, `Format gambar tidak didukung`, or `Ukuran foto melebihi batas maksimal 3MB`.
  * `403 Forbidden`: Intern attempting to upload photo for another intern's ID.
  * `404 Not Found`: `Peserta magang dengan ID '...' tidak ditemukan`.

---

### 2.2 Check-In with Selfie (`POST /api/attendance/check-in`)

* **Endpoint:** `POST /api/attendance/check-in`
* **Request Body:**
  ```json
  {
    "internId": "intern-sarah",
    "latitude": -6.180495,
    "longitude": 106.822769,
    "pin": "123456",
    "locationId": "loc-kppti",
    "photoUrl": "/uploads/selfies/intern-sarah-1728938400000-a1b2c3d4.jpg"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": "att-intern-sarah-2026-10-14",
    "internId": "intern-sarah",
    "date": "2026-10-14",
    "checkInTime": "08:15:20",
    "status": "ON_TIME",
    "remarks": "Tepat Waktu",
    "photoUrl": "/uploads/selfies/intern-sarah-1728938400000-a1b2c3d4.jpg"
  }
  ```
* **Side-Effect:** The intern's profile (`interns.photo_url`) is immediately updated with `photoUrl`.

---

### 2.3 Check-Out with Selfie (`POST /api/attendance/check-out`)

* **Endpoint:** `POST /api/attendance/check-out`
* **Request Body:**
  ```json
  {
    "internId": "intern-sarah",
    "latitude": -6.180495,
    "longitude": 106.822769,
    "pin": "123456",
    "photoUrl": "/uploads/selfies/intern-sarah-1728971400000-f9e8d7c6.jpg"
  }
  ```
  *(Note: Accepts either `photoUrl` or `checkOutPhotoUrl`)*
* **Success Response (`200 OK`):**
  ```json
  {
    "id": "att-intern-sarah-2026-10-14",
    "internId": "intern-sarah",
    "date": "2026-10-14",
    "checkOutTime": "17:35:10",
    "remarks": "Tepat Waktu | Tepat Waktu",
    "checkOutPhotoUrl": "/uploads/selfies/intern-sarah-1728971400000-f9e8d7c6.jpg"
  }
  ```
* **Side-Effect:** The intern's profile (`interns.photo_url`) is immediately updated with the new check-out selfie.

---

### 2.4 User Session Profile (`GET /api/auth/me`)

* **Endpoint:** `GET /api/auth/me`
* **Response (`200 OK`):**
  ```json
  {
    "user": {
      "id": "intern-sarah",
      "name": "Sarah Nurhaliza",
      "role": "INTERN",
      "divisi": "Network Operations",
      "email": "sarah@ioh.co.id",
      "photoUrl": "/uploads/selfies/intern-sarah-1728971400000-f9e8d7c6.jpg",
      "namaMentor": "Budi Santoso",
      "emailMentor": "budi.santoso@ioh.co.id"
    }
  }
  ```

---

## 3. Workflow & UX Architecture

```text
[ Intern clicks Check-In / Check-Out ]
                   │
                   ▼
       [ Geolocation Check Passed ]
                   │
                   ▼
     [ Step 1: Camera Selfie Modal ]
   - Front camera stream (video element)
   - Capture button -> Preview freeze
   - "Foto Ulang" or "Konfirmasi"
                   │
                   ▼
     [ Step 2: Upload API Call ]
   - POST /api/attendance/upload-photo
   - Receive: { photoUrl: "/uploads/selfies/..." }
                   │
                   ▼
     [ Step 3: PIN Verification Modal ]
   - Input 6-digit PIN
                   │
                   ▼
     [ Step 4: Attendance Punch Call ]
   - POST /api/attendance/(check-in|check-out)
   - Pass: { internId, coords, pin, photoUrl }
                   │
                   ▼
   [ Success Toast & Instant Profile Sync ]
   - ProfileCard avatar updates to latest selfie
   - Attendance status set to Present
```

---

## 4. Frontend Jobdesk Checklist (`branch: zacky`)

### 📋 Task F1: Camera / Selfie Capture Modal Component
* **New File:** [`src/components/SelfieModal.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/SelfieModal.tsx)
* **Actions:**
  - [ ] Implement camera stream using `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } })`.
  - [ ] Render circular or rounded squircle viewfinder with face positioning guide overlay.
  - [ ] Capture button: Draw current video frame to an offscreen `<canvas>`, call `canvas.toDataURL('image/jpeg', 0.85)` to produce a clean ~200-400KB base64 string.
  - [ ] Add mobile fallback `<input type="file" accept="image/*" capture="user" className="hidden" />` if camera permission is denied or device does not support WebRTC stream.
  - [ ] Show preview state with:
    - **"Foto Ulang"** button (re-enables video stream).
    - **"Gunakan Foto"** button (returns Base64 image to parent caller).
  - [ ] Ensure video stream tracks are stopped (`track.stop()`) on modal unmount or cancel to free device camera hardware.

### 📋 Task F2: Integrate Selfie Step in Punch Flow
* **Target File:** [`src/app/page.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/app/page.tsx)
* **Actions:**
  - [ ] When intern clicks Check-In or Check-Out (`initiateAttendance`), trigger `SelfieModal` before or immediately alongside `PinModal`.
  - [ ] Upon selfie confirmation:
    - Set uploading state (`Mengunggah foto selfie...`).
    - Call `POST /api/attendance/upload-photo` with `{ internId: currentInternId, image: base64Data, type: pendingActionType === 'check-in' ? 'CHECK_IN' : 'CHECK_OUT' }`.
    - Retrieve `data.photoUrl`.
  - [ ] In `executeAttendanceWithPin(pin)`:
    - Include `photoUrl` in the payload sent to `/api/attendance/check-in` or `/api/attendance/check-out`.
  - [ ] On successful response:
    - Update intern in state (`setInterns(...)` or refresh profile) so the new avatar reflects immediately.

### 📋 Task F3: Profile Photo Restoration in ProfileCard & Profile Page
* **Target Files:**
  - [`src/components/ProfileCard.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/components/ProfileCard.tsx)
  - [`src/app/profile/page.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/app/profile/page.tsx)
* **Actions:**
  - [ ] In `ProfileCard.tsx`:
    - Check if `active?.photoUrl` exists:
      ```tsx
      {active?.photoUrl ? (
        <img
          src={active.photoUrl}
          alt={active.namaLengkap}
          className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shadow-pink-500/10"
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-pink-500/20">
          {active?.namaLengkap ? active.namaLengkap.charAt(0) : 'U'}
        </div>
      )}
      ```
  - [ ] In `src/app/profile/page.tsx`:
    - Display `internProfile?.photoUrl || user?.photoUrl` in the header card avatar.
    - Add a small badge or caption under the photo: `"Foto Terverifikasi Absensi"`.

### 📋 Task F4: Update Client Auth & Offline Storage Cache
* **Target Files:**
  - [`src/lib/client-storage.ts`](file:///Users/mac/Web%20Development/indosat/attendance/src/lib/client-storage.ts)
  - [`src/context/AuthContext.tsx`](file:///Users/mac/Web%20Development/indosat/attendance/src/context/AuthContext.tsx)
* **Actions:**
  - [ ] Cache `photoUrl` in localStorage alongside intern session so when offline, the user's verified photo still renders cleanly without flashing default initials.

---

## 5. Mobile & iOS Safari Hard Guardrails

1. **`playsInline` Attribute is Mandatory:**
   ```html
   <video ref={videoRef} autoPlay playsInline muted className="..." />
   ```
   Without `playsInline` and `muted`, iOS Safari forces full-screen video playback and breaks the modal viewport.

2. **Canvas Dimension Capping:**
   Do not draw full 4K sensor images to canvas. Cap canvas size to `640x640` or `720x720` with `image/jpeg` quality `0.8` to keep uploads under ~300KB for lightning-fast cellular uploads.

3. **No Viewport Breaks:**
   Avoid fixed `h-screen` in the camera modal. Use `h-[100dvh]` or flexible max-height with `overflow-hidden` to prevent Safari bottom navigation bar layout traps.

---

## 6. Verification Commands for Frontend Team

```bash
# 1. Switch to frontend branch
git checkout zacky   # or git checkout feat/frontend-*

# 2. Pull & merge backend baseline
git merge vicky

# 3. Verify TypeScript build
npm run build

# 4. Verify test suite
npm test
```
