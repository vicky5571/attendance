import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, setOfficeConfig } from '../src/lib/db/repo.ts';
import { createOfficeLocation } from '../src/lib/db/locations-repo.ts';
import { POST as checkInRoute } from '../src/app/api/attendance/check-in/route.ts';
import { POST as checkOutRoute } from '../src/app/api/attendance/check-out/route.ts';
import { GET as statusRoute, DELETE as resetRoute } from '../src/app/api/attendance/status/route.ts';
import type { OfficeConfig, OfficeLocation, InternProfile } from '../src/types/index.ts';

describe('Development Mode Time Manipulation & Reset Engine', () => {
  const internId = 'intern-time-test';
  const targetDate = '2026-10-12';

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

    const loc: OfficeLocation = {
      id: 'loc-kppti',
      name: 'KPPTI HQ',
      latitude: -6.180495,
      longitude: 106.822769,
      maxRadiusMeters: 50,
      isActive: true,
    };
    createOfficeLocation(db, loc);

    const intern: InternProfile = {
      id: internId,
      namaLengkap: 'Tester Intern',
      divisi: 'DevOps',
      namaMentor: 'Lead Mentor',
      emailMentor: 'mentor@indosat.com',
      universitas: 'UI',
      jurusan: 'CS',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, intern);
  });

  it('should accept manipulated on-time timestamp (08:15) during check-in', async () => {
    const req = new Request('http://localhost:3000/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId,
        latitude: -6.180495,
        longitude: 106.822769,
        timestamp: `${targetDate}T08:15:00`,
      }),
    });

    const res = await checkInRoute(req);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.checkInTime, '08:15:00');
    assert.equal(data.remarks, 'Tepat Waktu');
  });

  it('should accept manipulated late timestamp (08:45) during check-in', async () => {
    const req = new Request('http://localhost:3000/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId,
        latitude: -6.180495,
        longitude: 106.822769,
        timestamp: `${targetDate}T08:45:00`,
      }),
    });

    const res = await checkInRoute(req);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.checkInTime, '08:45:00');
    assert.equal(data.remarks, 'Terlambat 15 menit');
  });

  it('should accept manipulated early check-out timestamp (16:30)', async () => {
    // 1. Check in first
    await checkInRoute(
      new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId,
          latitude: -6.180495,
          longitude: 106.822769,
          timestamp: `${targetDate}T08:15:00`,
        }),
      })
    );

    // 2. Check out early at 16:30
    const reqOut = new Request('http://localhost:3000/api/attendance/check-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId,
        latitude: -6.180495,
        longitude: 106.822769,
        timestamp: `${targetDate}T16:30:00`,
      }),
    });

    const resOut = await checkOutRoute(reqOut);
    assert.equal(resOut.status, 200);
    const dataOut = await resOut.json();
    assert.equal(dataOut.checkOutTime, '16:30:00');
    assert.ok(dataOut.remarks.includes('Pulang sebelum waktu kerja: lebih awal 60 menit'));
  });

  it('should support resetting attendance status via DELETE /api/attendance/status for iterative dev testing', async () => {
    // 1. Check in
    await checkInRoute(
      new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId,
          latitude: -6.180495,
          longitude: 106.822769,
          timestamp: `${targetDate}T08:15:00`,
        }),
      })
    );

    // 2. Verify checked in
    const statusReq = new Request(`http://localhost:3000/api/attendance/status?internId=${internId}&date=${targetDate}`);
    const statusBefore = await (await statusRoute(statusReq)).json();
    assert.equal(statusBefore.checkedIn, true);

    // 3. Reset
    const deleteReq = new Request(`http://localhost:3000/api/attendance/status?internId=${internId}&date=${targetDate}`, {
      method: 'DELETE',
    });
    const delRes = await resetRoute(deleteReq);
    assert.equal(delRes.status, 200);

    // 4. Verify status is reset
    const statusAfter = await (await statusRoute(statusReq)).json();
    assert.equal(statusAfter.checkedIn, false);
    assert.equal(statusAfter.record, null);
  });
});
