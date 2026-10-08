import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET as exportRoute } from '../src/app/api/reports/monthly-export/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, recordCheckIn, recordCheckOut } from '../src/lib/db/repo.ts';
import { createAttendanceRequest } from '../src/lib/db/requests-repo.ts';
import type { InternProfile } from '../src/types/index.ts';

describe('Monthly University Report Export Streamer (CSV)', () => {
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

    // Day 1: Check In & Out
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

    // Day 2: Approved WFH
    createAttendanceRequest(db, {
      id: 'req-1',
      internId: 'intern-sarah',
      date: '2026-10-02',
      type: 'WFH',
      reason: 'Sprint planning',
      status: 'APPROVED',
      createdAt: '2026-10-02T07:00:00Z',
    });
  });

  it('should stream formatted CSV with proper headers and content', async () => {
    const req = new Request('http://localhost:3000/api/reports/monthly-export?internId=intern-sarah&month=2026-10');
    const res = await exportRoute(req);

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('Content-Type')?.includes('text/csv'));
    assert.ok(res.headers.get('Content-Disposition')?.includes('recap-intern-sarah-2026-10.csv'));

    const csvText = await res.text();
    assert.ok(csvText.includes('ID Intern,Nama Lengkap,Divisi,Tanggal,Jam Masuk,Jam Keluar,Status,Total Jam,Keterangan'));
    assert.ok(csvText.includes('intern-sarah,Sarah Nurhaliza,Network Operations,2026-10-01,08:30:00,17:30:00,ON_TIME'));
    assert.ok(csvText.includes('WFH'));
  });

  it('should return 400 when missing query parameters', async () => {
    const req = new Request('http://localhost:3000/api/reports/monthly-export');
    const res = await exportRoute(req);
    assert.equal(res.status, 400);
  });

  it('should return 404 for non-existent intern', async () => {
    const req = new Request('http://localhost:3000/api/reports/monthly-export?internId=unknown&month=2026-10');
    const res = await exportRoute(req);
    assert.equal(res.status, 404);
  });
});
