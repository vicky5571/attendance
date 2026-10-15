# Intern Registration System with Biometric Face Verification — Technical Specification

**Date:** 2026-10-15  
**Author:** Critical Senior Software Engineer (`branch: vicky`)  
**Scope:** Backend API, Biometric Face Detection Service, Database Persistence, and Isolated Raw HTML/CSS Registration Form  
**Status:** Approved  

---

## 1. Problem Statement & Objectives

Currently, interns in the attendance system are either pre-seeded via `src/lib/db/seed.ts` or created through internal admin APIs. While check-in and check-out support selfie photo uploads, there is no public self-registration flow for new interns that captures and validates their official reference face photo.

### Objectives
1. Provide an intern registration endpoint `POST /api/auth/register` that validates intern data and credentials.
2. Integrate a biometric face detection service (`src/lib/services/face-detection.ts`) using `sharp` to verify that an uploaded photo actually contains a clear human face (rejecting blank images, scenery, drawings, and inanimate objects).
3. Persist the validated face image to `/public/uploads/faces/<internId>-face-<timestamp>.jpg` and store the public URL in `interns.photo_url`.
4. Provide an isolated raw HTML/CSS registration form at `/register` (`src/app/register/page.tsx`) with live webcam capture and file upload fallback, ensuring zero coupling or style conflicts with Zacky's frontend PWA components.
5. Maintain the sub-500ms test harness performance constraint (`npm run test:fast`) with 0 new heavy dependencies.

---

## 2. Architecture & Domain Contracts

### 2.1 Domain Types (`src/types/index.ts`)

Add the registration payload interface:

```typescript
export interface InternRegistrationPayload {
  namaLengkap: string;
  email: string;
  password: string;
  pin: string; // 6-digit numeric PIN
  divisi: string;
  namaMentor: string;
  emailMentor: string;
  universitas: string;
  jurusan: string;
  periodeMagangSelesai: string; // YYYY-MM-DD
  assignedLocationId?: string;
  facePhoto: string; // Base64 data URI or raw base64
}

export interface RegistrationResponse {
  message: string;
  intern: InternProfile;
}
```

### 2.2 Biometric Face Detection Service (`src/lib/services/face-detection.ts`)

The face detection validator processes raw image buffers via `sharp`:
1. **Dimension & Aspect Ratio Verification**:
   - Minimum resolution: 150×150 px.
   - Aspect ratio: must be reasonably portrait or square (0.6 to 1.5 aspect ratio).
2. **YCbCr Chromatic Skin Cluster Analysis (Kovac et al. Biometric Standard)**:
   - Converts pixels to YCbCr color space.
   - Evaluates whether chromatic components satisfy standard human skin tone ranges:
     - $Cb \in [77, 127]$
     - $Cr \in [133, 173]$
   - Minimum skin-tone coverage required: between 12% and 85% of total pixel count (rejecting non-skin objects and solid fills).
3. **Facial Feature Contrast & Variance**:
   - Computes standard deviation and gradient variation across luminance ($Y$) to detect facial feature structure (eyes, eyebrows, mouth).
   - Rejects flat/uniform images with low variance (< 18.0 standard deviation).
4. **Result Structure**:
   ```typescript
   export interface FaceDetectionResult {
     detected: boolean;
     reason?: string;
     metrics?: {
       width: number;
       height: number;
       skinRatio: number;
       variance: number;
     };
   }
   ```

### 2.3 Registration API Endpoint (`POST /api/auth/register`)

* **Route:** `src/app/api/auth/register/route.ts`
* **Method:** `POST`
* **Validation Rules:**
  - `namaLengkap`: string, min 3 chars.
  - `email`: valid email format, must be unique across `interns.email`.
  - `password`: string, min 6 chars.
  - `pin`: numeric string, exactly 6 digits (`/^\d{6}$/`).
  - `divisi`, `namaMentor`, `emailMentor`, `universitas`, `jurusan`, `periodeMagangSelesai`: non-empty strings.
  - `facePhoto`: valid Base64 string / Data URI, <= 3MB, MIME `image/jpeg`, `image/png`, or `image/webp`.
* **Face Verification**:
  - Decode buffer and execute `detectFace(buffer)`.
  - If `!result.detected` -> respond with `422 Unprocessable Entity`:
    `{ error: 'Tidak terdeteksi wajah manusia pada foto yang diunggah. Pastikan wajah terlihat jelas dan menghadap kamera.', details: result.reason }`.
* **Persistence**:
  - Write photo to disk: `public/uploads/faces/<internId>-face-<timestamp>.jpg`.
  - Hash password with `hashPassword(password)` (scrypt).
  - Hash PIN or store plaintext/hash via `hashPin(pin)` / `pin`.
  - Save `InternProfile` via `createIntern(db, ...)`.
  - Return `201 Created` with intern profile data.

### 2.4 Isolated Raw HTML/CSS Registration Page (`src/app/register/page.tsx`)

* **Route:** `/register`
* **Implementation:** Pure semantic HTML + scoped `<style>` block:
  - Container with minimalist raw CSS (clean card layout, system sans-serif fonts, no Tailwind class names to avoid polluting frontend PWA styles).
  - Video element (`<video autoPlay playsInline muted>`) with canvas capture for live webcam.
  - Snapshot button (`Ambil Foto`) + preview state (`Foto Ulang`).
  - Fallback `<input type="file" accept="image/*">` for devices without camera stream.
  - Input fields for all required registration fields.
  - Office location `<select>` dynamically populated from `GET /api/config/locations`.
  - Asynchronous form submission using `fetch('/api/auth/register')`.
  - Inline error alert box and success confirmation with redirect button to `/login`.

---

## 3. Security, Performance & Invariants

1. **Anti-Collusion & Integrity:**
   - Password hashing with salted `scrypt`.
   - Email uniqueness strictly verified before file writing and database insert.
2. **Sub-500ms Fast Test Harness:**
   - Sharp-based image processing executes under 20ms per photo.
   - Comprehensive test suite runs in under 400ms without requiring network or heavy ML runtimes.
3. **Zero Frontend Interference:**
   - Frontend branch `zacky` owns Tailwind PWA styling.
   - The `/register` page uses pure vanilla scoped styles so it can be used immediately by backend/QA and later refactored by Zacky into a branded PWA component when scheduled.

