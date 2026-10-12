import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET as getHistoryRoute } from '../src/app/api/attendance/history/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, recordCheckIn, recordCheckOut } from '../src/lib/db/repo.ts';
import { createAttendanceRequest } from '../src/lib/db/requests-repo.ts';
import type { InternProfile } from '../src/types/index.ts';

describe('Timesheet & Monthly History Aggregator API', () => {
  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const intern: InternProfile = {
      id: 'intern-sarah',
      namaLengkap: 'Sarah Nurhaliza',
      divisi: 'Network Operations',
      namaMentor: 'Budi Santoso',
      emailMentor: 'budi.santoso@indosat.com',
      universitas: 'ITB',
      jurusan: 'Telekomunikasi',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, intern);

    // Day 1: On-Time full day (08:30 - 17:30 = 9.0 hours)
    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-sarah',
      date: '2026-10-01',
      checkInTime: '08:30:00',
      status: 'ON_TIME',
      remarks: 'Tepat Waktu',
    });
    recordCheckOut(db, 'intern-sarah', '2026-10-01', {
      checkOutTime: '17:30:00',
      remarks: 'Tepat Waktu',
    });

    // Day 2: Late check-in (09:00 - 18:00 = 9.0 hours)
    recordCheckIn(db, {
      id: 'att-2',
      internId: 'intern-sarah',
      date: '2026-10-02',
      checkInTime: '09:00:00',
      status: 'LATE',
      remarks: 'Terlambat 30 menit',
    });
    recordCheckOut(db, 'intern-sarah', '2026-10-02', {
      checkOutTime: '18:00:00',
      remarks: 'Tepat Waktu',
    });

    // Day 3: Early departure (08:30 - 16:30 = 8.0 hours)
    recordCheckIn(db, {
      id: 'att-3',
      internId: 'intern-sarah',
      date: '2026-10-05',
      checkInTime: '08:30:00',
      status: 'EARLY_DEPARTURE',
      remarks: 'Tepat Waktu',
    });
    recordCheckOut(db, 'intern-sarah', '2026-10-05', {
      checkOutTime: '16:30:00',
      remarks: 'Pulang sebelum waktu kerja: lebih awal 60 menit',
    });

    // Day 4: Approved WFH Request
    createAttendanceRequest(db, {
      id: 'req-wfh-1',
      internId: 'intern-sarah',
      date: '2026-10-06',
      type: 'WFH',
      reason: 'Remote network monitoring',
      status: 'APPROVED',
      createdAt: '2026-10-06T07:00:00Z',
    });

    // Day 5: Approved SAKIT Request
    createAttendanceRequest(db, {
      id: 'req-sakit-1',
      internId: 'intern-sarah',
      date: '2026-10-07',
      type: 'SAKIT',
      reason: 'Demam',
      status: 'APPROVED',
      createdAt: '2026-10-07T07:00:00Z',
    });
  });

  it('should return aggregated monthly statistics and record history', async () => {
    const req = new Request('http://localhost:3000/api/attendance/history?internId=intern-sarah&month=2026-10');
    const res = await getHistoryRoute(req);

    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.summary);
    assert.equal(data.summary.internId, 'intern-sarah');
    assert.equal(data.summary.month, '2026-10');
    assert.equal(data.summary.presentDays, 3);
    assert.equal(data.summary.onTimeDays, 1);
    assert.equal(data.summary.lateDays, 1);
    assert.equal(data.summary.earlyDepartureDays, 1);
    assert.equal(data.summary.wfhDays, 1);
    assert.equal(data.summary.sickDays, 1);
    assert.equal(data.summary.totalWorkHours, 26); // 9 + 9 + 8
    assert.ok(data.summary.punctualityRate > 0);

    assert.equal(data.records.length, 3);
    assert.equal(data.requests.length, 2);
  });

  it('should return 400 when internId or month query parameters are missing', async () => {
    const req = new Request('http://localhost:3000/api/attendance/history');
    const res = await getHistoryRoute(req);
    assert.equal(res.status, 400);
  });
});
