import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateDailyRecap,
  formatDailyInternsReport,
  generateRecapHtmlTable,
} from '../src/lib/services/recap.ts';
import { createDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, recordCheckIn } from '../src/lib/db/repo.ts';
import { createAttendanceRequest } from '../src/lib/db/requests-repo.ts';
import type { InternProfile } from '../src/types/index.ts';

describe('Daily Attendance Recap with Leave & Remote Work Integration', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initSchema(db);

    const interns: InternProfile[] = [
      {
        id: 'intern-1',
        namaLengkap: 'Zacky OnTime',
        divisi: 'Frontend',
        namaMentor: 'Mentor A',
        emailMentor: 'a@indosat.com',
        universitas: 'UI',
        jurusan: 'SI',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      },
      {
        id: 'intern-2',
        namaLengkap: 'Sarah WFH',
        divisi: 'Network',
        namaMentor: 'Mentor B',
        emailMentor: 'b@indosat.com',
        universitas: 'ITB',
        jurusan: 'TT',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      },
      {
        id: 'intern-3',
        namaLengkap: 'Budi Sakit',
        divisi: 'Network',
        namaMentor: 'Mentor B',
        emailMentor: 'b@indosat.com',
        universitas: 'UGM',
        jurusan: 'TE',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      },
      {
        id: 'intern-4',
        namaLengkap: 'Doni Alpha',
        divisi: 'Digital',
        namaMentor: 'Mentor C',
        emailMentor: 'c@indosat.com',
        universitas: 'ITS',
        jurusan: 'IF',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      },
    ];

    for (const intern of interns) {
      createIntern(db, intern);
    }

    // Intern 1: Normal on-time check-in
    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-1',
      date: '2026-10-09',
      checkInTime: '08:15:00',
      status: 'ON_TIME',
      remarks: 'Tepat Waktu',
    });

    // Intern 2: Approved WFH
    createAttendanceRequest(db, {
      id: 'req-2',
      internId: 'intern-2',
      date: '2026-10-09',
      type: 'WFH',
      reason: 'Remote deployment sprint',
      status: 'APPROVED',
      createdAt: '2026-10-09T07:00:00Z',
    });

    // Intern 3: Approved SAKIT
    createAttendanceRequest(db, {
      id: 'req-3',
      internId: 'intern-3',
      date: '2026-10-09',
      type: 'SAKIT',
      reason: 'Demam dan flu (surat dokter)',
      status: 'APPROVED',
      createdAt: '2026-10-09T07:30:00Z',
    });

    // Intern 4: No log, no request -> Absent / Alpha
  });

  it('should categorize WFH and SAKIT properly in daily recap summary', () => {
    const recap = aggregateDailyRecap(db, '2026-10-09');

    assert.equal(recap.totalActive, 4);
    assert.equal(recap.presentCount, 2); // 1 OnTime + 1 WFH
    assert.equal(recap.onTimeCount, 1);
    assert.equal(recap.wfhCount, 1);
    assert.equal(recap.sickCount, 1);
    assert.equal(recap.absentCount, 1); // Only Intern 4

    const wfhItem = recap.items.find((i) => i.internId === 'intern-2');
    assert.ok(wfhItem);
    assert.equal(wfhItem.status, 'WFH');

    const sakitItem = recap.items.find((i) => i.internId === 'intern-3');
    assert.ok(sakitItem);
    assert.equal(sakitItem.status, 'SAKIT');

    const absentItem = recap.items.find((i) => i.internId === 'intern-4');
    assert.ok(absentItem);
    assert.equal(absentItem.status, 'ABSENT');
  });

  it('should include [WFH] and [SAKIT] badges in WhatsApp intern broadcast message', () => {
    const recap = aggregateDailyRecap(db, '2026-10-09');
    const msg = formatDailyInternsReport(recap);

    assert.ok(msg.includes('WFH') || msg.includes('🏡'));
    assert.ok(msg.includes('SAKIT') || msg.includes('🏥'));
  });

  it('should generate valid HTML recap table containing leave badges', () => {
    const recap = aggregateDailyRecap(db, '2026-10-09');
    const html = generateRecapHtmlTable(recap);

    assert.ok(html.includes('WFH'));
    assert.ok(html.includes('SAKIT'));
  });
});
