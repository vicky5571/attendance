import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { getDatabase, createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { getInternByEmail } from '../src/lib/db/repo.ts';
import { verifyPassword, verifyPin } from '../src/lib/auth.ts';
import { POST as registerRoute } from '../src/app/api/auth/register/route.ts';
import { POST as loginRoute } from '../src/app/api/auth/login/route.ts';

// Helper to create a valid base64 face image
async function createValidFaceBase64(): Promise<string> {
  const svg = `
    <svg width="240" height="280" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#E0E0E0"/>
      <ellipse cx="120" cy="140" rx="75" ry="95" fill="#D7A282"/>
      <ellipse cx="95" cy="120" rx="12" ry="7" fill="#2C1D11"/>
      <ellipse cx="145" cy="120" rx="12" ry="7" fill="#2C1D11"/>
      <rect x="80" y="105" width="28" height="5" fill="#1C120C" rx="2"/>
      <rect x="132" y="105" width="28" height="5" fill="#1C120C" rx="2"/>
      <line x1="120" y1="125" x2="117" y2="150" stroke="#B87B5C" stroke-width="3"/>
      <ellipse cx="120" cy="180" rx="22" ry="8" fill="#A84C52"/>
    </svg>
  `;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

// Helper to create non-face base64 (e.g. solid blue)
async function createNonFaceBase64(): Promise<string> {
  const buf = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 10, g: 50, b: 240 },
    },
  })
    .jpeg()
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

describe('Intern Registration API (POST /api/auth/register)', () => {
  const createdPhotos: string[] = [];

  before(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);
  });

  after(() => {
    // Cleanup created test photo files
    for (const relPath of createdPhotos) {
      const fullPath = join(process.cwd(), 'public', relPath.replace(/^\//, ''));
      if (existsSync(fullPath)) {
        try {
          unlinkSync(fullPath);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });

  test('should successfully register a new intern with face photo and return 201', async () => {
    const facePhoto = await createValidFaceBase64();
    const payload = {
      namaLengkap: 'Dimas Wicaksono',
      email: 'dimas.wicaksono@ioh.co.id',
      password: 'SecurePassword2026!',
      divisi: 'Cloud Infrastructure',
      namaMentor: 'Vicky Backend Lead',
      emailMentor: 'mentor.vicky@indosat.com',
      universitas: 'Institut Teknologi Bandung',
      jurusan: 'Teknik Komputer',
      periodeMagangSelesai: '2026-12-31',
      assignedLocationId: 'loc-kppti',
      facePhoto,
    };

    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await registerRoute(req);
    assert.strictEqual(res.status, 201);

    const data = await res.json();
    assert.strictEqual(data.message, 'Registrasi berhasil');
    assert.ok(data.intern, 'Should return intern profile');
    assert.strictEqual(data.intern.namaLengkap, 'Dimas Wicaksono');
    assert.strictEqual(data.intern.email, 'dimas.wicaksono@ioh.co.id');
    assert.ok(data.intern.photoUrl, 'Should have photoUrl set');
    assert.ok(data.intern.photoUrl.startsWith('/uploads/faces/'), 'photoUrl should point to /uploads/faces/');

    createdPhotos.push(data.intern.photoUrl);

    // Verify file exists on disk
    const onDiskPath = join(process.cwd(), 'public', data.intern.photoUrl.replace(/^\//, ''));
    assert.ok(existsSync(onDiskPath), `File should exist on disk at ${onDiskPath}`);

    // Verify DB record
    const db = getDatabase();
    const internInDb = getInternByEmail(db, 'dimas.wicaksono@ioh.co.id');
    assert.ok(internInDb);
    assert.strictEqual(internInDb.namaLengkap, 'Dimas Wicaksono');
    assert.ok(internInDb.passwordHash);
    assert.ok(verifyPassword('SecurePassword2026!', internInDb.passwordHash));
    assert.strictEqual(internInDb.photoUrl, data.intern.photoUrl);

    // Verify newly registered user can login immediately
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dimas.wicaksono@ioh.co.id',
        password: 'SecurePassword2026!',
      }),
    });
    const loginRes = await loginRoute(loginReq);
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.user.name, 'Dimas Wicaksono');
    assert.strictEqual(loginData.user.photoUrl, data.intern.photoUrl);
  });

  test('should reject registration missing required fields with 400', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namaLengkap: 'Tanpa Email',
        // missing email, password, pin, etc.
      }),
    });

    const res = await registerRoute(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /wajib diisi|tidak lengkap/i);
  });

  test('should successfully register even without providing any PIN', async () => {
    const facePhoto = await createValidFaceBase64();
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namaLengkap: 'Budi Santoso',
        email: 'budi.nopin@ioh.co.id',
        password: 'Password123!',
        divisi: 'IT',
        namaMentor: 'Mentor',
        emailMentor: 'mentor@ioh.co.id',
        universitas: 'UI',
        jurusan: 'TI',
        periodeMagangSelesai: '2026-12-31',
        facePhoto,
      }),
    });

    const res = await registerRoute(req);
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.message, 'Registrasi berhasil');
    createdPhotos.push(data.intern.photoUrl);
  });

  test('should reject registration with already registered email with 409', async () => {
    const facePhoto = await createValidFaceBase64();
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namaLengkap: 'Dimas Wicaksono Duplikat',
        email: 'dimas.wicaksono@ioh.co.id', // Already registered
        password: 'SecurePassword2026!',
        pin: '654321',
        divisi: 'Cloud Infrastructure',
        namaMentor: 'Vicky Backend Lead',
        emailMentor: 'mentor.vicky@indosat.com',
        universitas: 'Institut Teknologi Bandung',
        jurusan: 'Teknik Komputer',
        periodeMagangSelesai: '2026-12-31',
        facePhoto,
      }),
    });

    const res = await registerRoute(req);
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.match(data.error, /email.*sudah terdaftar/i);
  });

  test('should reject registration when face detection fails with 422', async () => {
    const nonFacePhoto = await createNonFaceBase64();
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namaLengkap: 'User Non Face',
        email: 'user.nonface@ioh.co.id',
        password: 'SecurePassword2026!',
        pin: '112233',
        divisi: 'Design',
        namaMentor: 'Vicky Lead',
        emailMentor: 'mentor@indosat.com',
        universitas: 'ITB',
        jurusan: 'Desain',
        periodeMagangSelesai: '2026-12-31',
        facePhoto: nonFacePhoto,
      }),
    });

    const res = await registerRoute(req);
    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.match(data.error, /wajah manusia/i);
  });
});
