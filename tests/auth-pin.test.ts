import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPin } from '../src/lib/auth.ts';
import { POST as verifyPinRoute } from '../src/app/api/interns/verify-pin/route.ts';
import { POST as checkInRoute } from '../src/app/api/attendance/check-in/route.ts';
import { POST as checkOutRoute } from '../src/app/api/attendance/check-out/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, setOfficeConfig } from '../src/lib/db/repo.ts';
import type { InternProfile, OfficeConfig } from '../src/types/index.ts';

describe('Anti-Proxy PIN Authentication & Verification Layer', () => {
  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const config: OfficeConfig = {
      targetLatitude: -6.180495,
      targetLongitude: 106.822769,
      maxRadiusMeters: 50,
      workStartTime: '08:30',
      workEndTime: '17:30',
      emailAtasan: 'boss@indosat.com',
    };
    setOfficeConfig(db, config);

    const internWithPin: InternProfile = {
      id: 'intern-pin',
      namaLengkap: 'Protected Intern',
      divisi: 'Security',
      namaMentor: 'Lead Sec',
      emailMentor: 'sec@indosat.com',
      universitas: 'UI',
      jurusan: 'CS',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
      pinHash: hashPin('889900'),
    };
    createIntern(db, internWithPin);

    const legacyIntern: InternProfile = {
      id: 'intern-nopin',
      namaLengkap: 'Legacy Intern',
      divisi: 'Legacy',
      namaMentor: 'Lead',
      emailMentor: 'lead@indosat.com',
      universitas: 'ITB',
      jurusan: 'EE',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, legacyIntern);
  });

  describe('Native Crypto Helper (src/lib/auth.ts)', () => {
    it('should hash PIN consistently with salt and verify correctly', () => {
      const pin = '123456';
      const hashed = hashPin(pin);
      assert.notEqual(hashed, pin);
      assert.ok(verifyPin(pin, hashed));
      assert.ok(!verifyPin('654321', hashed));
    });
  });

  describe('POST /api/interns/verify-pin', () => {
    it('should return 200 with valid: true for correct PIN', async () => {
      const req = new Request('http://localhost:3000/api/interns/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: 'intern-pin', pin: '889900' }),
      });
      const res = await verifyPinRoute(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.valid, true);
    });

    it('should return 401 Unauthorized for incorrect PIN', async () => {
      const req = new Request('http://localhost:3000/api/interns/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: 'intern-pin', pin: '000000' }),
      });
      const res = await verifyPinRoute(req);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.valid, false);
    });

    it('should return 404 for non-existent intern', async () => {
      const req = new Request('http://localhost:3000/api/interns/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: 'unknown', pin: '123456' }),
      });
      const res = await verifyPinRoute(req);
      assert.equal(res.status, 404);
    });
  });

  describe('Frictionless Check-In & Check-Out (No PIN Required)', () => {
    it('should allow check-in without PIN even for intern with pinHash configured', async () => {
      const req = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-pin',
          latitude: -6.180495,
          longitude: 106.822769,
        }),
      });
      const res = await checkInRoute(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.internId, 'intern-pin');
    });

    it('should allow check-in when optional PIN or arbitrary PIN is passed', async () => {
      const req = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-pin-2',
          latitude: -6.180495,
          longitude: 106.822769,
          pin: 'any-string',
        }),
      });
      // intern-pin-2 doesn't exist yet, so create or use intern-nopin
      const nopinReq = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-nopin',
          latitude: -6.180495,
          longitude: 106.822769,
          pin: 'legacy-pin',
        }),
      });
      const res = await checkInRoute(nopinReq);
      assert.equal(res.status, 201);
    });

    it('should allow check-out without PIN for intern with pinHash', async () => {
      // 1. Check in first without PIN
      const inRes = await checkInRoute(
        new Request('http://localhost:3000/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            internId: 'intern-pin',
            latitude: -6.180495,
            longitude: 106.822769,
          }),
        })
      );
      assert.equal(inRes.status, 201);

      // 2. Check out directly without PIN
      const outRes = await checkOutRoute(
        new Request('http://localhost:3000/api/attendance/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            internId: 'intern-pin',
            latitude: -6.180495,
            longitude: 106.822769,
          }),
        })
      );
      assert.equal(outRes.status, 200);
      const outData = await outRes.json();
      assert.ok(outData.checkOutTime);
    });
  });
});
