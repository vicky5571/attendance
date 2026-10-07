import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST as postCheckIn } from '../src/app/api/attendance/check-in/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { setOfficeConfig, createIntern } from '../src/lib/db/repo.ts';
import type { OfficeConfig, InternProfile } from '../src/types/index.ts';

describe('POST /api/attendance/check-in', () => {
  const INDOSAT_HQ = { latitude: -6.180495, longitude: 106.822769 };

  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const config: OfficeConfig = {
      targetLatitude: INDOSAT_HQ.latitude,
      targetLongitude: INDOSAT_HQ.longitude,
      maxRadiusMeters: 50,
      workStartTime: '08:30',
      workEndTime: '17:30',
      emailAtasan: 'supervisor@indosat.com',
    };
    setOfficeConfig(db, config);

    const intern: InternProfile = {
      id: 'intern-zacky',
      namaLengkap: 'Zacky Kurniawan',
      divisi: 'Digital Experience',
      namaMentor: 'Vicky Lead',
      emailMentor: 'vicky@indosat.com',
      universitas: 'UI',
      jurusan: 'SI',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, intern);
  });

  it('should accept valid check-in within geofence radius and return 201', async () => {
    const req = new Request('http://localhost:3000/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId: 'intern-zacky',
        latitude: INDOSAT_HQ.latitude + 0.0001, // ~11 meters away
        longitude: INDOSAT_HQ.longitude,
        timestamp: '2026-10-08T08:15:00',
      }),
    });

    const res = await postCheckIn(req);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.equal(data.internId, 'intern-zacky');
    assert.equal(data.date, '2026-10-08');
    assert.equal(data.status, 'ON_TIME');
    assert.equal(data.remarks, 'Tepat Waktu');
    assert.ok(data.distanceInMeters <= 50);
  });

  it('should reject check-in outside geofence radius with 403 Forbidden', async () => {
    const req = new Request('http://localhost:3000/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId: 'intern-zacky',
        latitude: -6.200000, // ~2.1km away
        longitude: 106.822769,
        timestamp: '2026-10-08T08:15:00',
      }),
    });

    const res = await postCheckIn(req);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.match(data.error, /geofence/i);
    assert.ok(data.distanceInMeters > 50);
  });

  it('should record late status and remark when check-in is past work start time', async () => {
    const req = new Request('http://localhost:3000/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId: 'intern-zacky',
        latitude: INDOSAT_HQ.latitude,
        longitude: INDOSAT_HQ.longitude,
        timestamp: '2026-10-08T08:45:00',
      }),
    });

    const res = await postCheckIn(req);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.equal(data.status, 'LATE');
    assert.equal(data.remarks, 'Terlambat 15 menit');
  });

  it('should reject duplicate check-in on the same date with 409 Conflict', async () => {
    const makeReq = () =>
      new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-zacky',
          latitude: INDOSAT_HQ.latitude,
          longitude: INDOSAT_HQ.longitude,
          timestamp: '2026-10-08T08:10:00',
        }),
      });

    const res1 = await postCheckIn(makeReq());
    assert.equal(res1.status, 201);

    const res2 = await postCheckIn(makeReq());
    assert.equal(res2.status, 409);
  });

  it('should return 404 if intern is not found', async () => {
    const req = new Request('http://localhost:3000/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId: 'intern-ghost',
        latitude: INDOSAT_HQ.latitude,
        longitude: INDOSAT_HQ.longitude,
        timestamp: '2026-10-08T08:10:00',
      }),
    });

    const res = await postCheckIn(req);
    assert.equal(res.status, 404);
  });
});
