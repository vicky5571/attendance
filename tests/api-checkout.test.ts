import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST as postCheckOut } from '../src/app/api/attendance/check-out/route.ts';
import { GET as getStatus } from '../src/app/api/attendance/status/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { setOfficeConfig, createIntern, recordCheckIn } from '../src/lib/db/repo.ts';
import type { OfficeConfig, InternProfile, AttendanceRecord } from '../src/types/index.ts';

describe('Check-Out & Status APIs', () => {
  const INDOSAT_HQ = { latitude: -6.180495, longitude: 106.822769 };
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
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

  describe('POST /api/attendance/check-out', () => {
    it('should successfully record check-out on time', async () => {
      const initial: AttendanceRecord = {
        id: 'att-intern-zacky-2026-10-08',
        internId: 'intern-zacky',
        date: '2026-10-08',
        checkInTime: '08:25:00',
        checkInCoords: INDOSAT_HQ,
        distanceInMeters: 5,
        status: 'ON_TIME',
        remarks: 'Tepat Waktu',
      };
      recordCheckIn(db, initial);

      const req = new Request('http://localhost:3000/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-zacky',
          latitude: INDOSAT_HQ.latitude,
          longitude: INDOSAT_HQ.longitude,
          timestamp: '2026-10-08T17:35:00',
        }),
      });

      const res = await postCheckOut(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.checkOutTime, '17:35:00');
      assert.match(data.remarks, /Tepat Waktu/);
    });

    it('should flag early departure if check-out is before work end time', async () => {
      const initial: AttendanceRecord = {
        id: 'att-intern-zacky-2026-10-08',
        internId: 'intern-zacky',
        date: '2026-10-08',
        checkInTime: '08:25:00',
        checkInCoords: INDOSAT_HQ,
        distanceInMeters: 5,
        status: 'ON_TIME',
        remarks: 'Tepat Waktu',
      };
      recordCheckIn(db, initial);

      const req = new Request('http://localhost:3000/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-zacky',
          latitude: INDOSAT_HQ.latitude,
          longitude: INDOSAT_HQ.longitude,
          timestamp: '2026-10-08T16:45:00',
        }),
      });

      const res = await postCheckOut(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.match(data.remarks, /lebih awal 45 menit/i);
    });

    it('should reject check-out if check-in has not occurred yet', async () => {
      const req = new Request('http://localhost:3000/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-zacky',
          latitude: INDOSAT_HQ.latitude,
          longitude: INDOSAT_HQ.longitude,
          timestamp: '2026-10-08T17:35:00',
        }),
      });

      const res = await postCheckOut(req);
      assert.equal(res.status, 404);
    });
  });

  describe('GET /api/attendance/status', () => {
    it('should return checkedIn: false when no record exists', async () => {
      const req = new Request('http://localhost:3000/api/attendance/status?internId=intern-zacky&date=2026-10-08');
      const res = await getStatus(req);

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.checkedIn, false);
      assert.equal(data.checkedOut, false);
      assert.equal(data.record, null);
    });

    it('should return checkedIn: true, checkedOut: false when checked in', async () => {
      recordCheckIn(db, {
        id: 'att-1',
        internId: 'intern-zacky',
        date: '2026-10-08',
        checkInTime: '08:20:00',
        status: 'ON_TIME',
      });

      const req = new Request('http://localhost:3000/api/attendance/status?internId=intern-zacky&date=2026-10-08');
      const res = await getStatus(req);

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.checkedIn, true);
      assert.equal(data.checkedOut, false);
      assert.ok(data.record);
    });
  });
});
