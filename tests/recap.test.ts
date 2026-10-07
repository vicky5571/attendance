import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, recordCheckIn, recordCheckOut } from '../src/lib/db/repo.ts';
import {
  aggregateDailyRecap,
  formatDailyInternsReport,
  formatMentorGroupRecap,
  generateRecapHtmlTable,
} from '../src/lib/services/recap.ts';
import type { InternProfile } from '../src/types/index.ts';

describe('Daily Attendance Recap & Formatters', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const intern1: InternProfile = {
      id: 'intern-zacky',
      namaLengkap: 'Zacky Kurniawan',
      divisi: 'Digital Experience',
      namaMentor: 'Vicky Backend Lead',
      emailMentor: 'vicky@indosat.com',
      universitas: 'UI',
      jurusan: 'SI',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    const intern2: InternProfile = {
      id: 'intern-sarah',
      namaLengkap: 'Sarah Nurhaliza',
      divisi: 'Digital Experience',
      namaMentor: 'Vicky Backend Lead',
      emailMentor: 'vicky@indosat.com',
      universitas: 'ITB',
      jurusan: 'IF',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    const intern3: InternProfile = {
      id: 'intern-budi',
      namaLengkap: 'Budi Setiawan',
      divisi: 'Network Operations',
      namaMentor: 'Anton Network Lead',
      emailMentor: 'anton@indosat.com',
      universitas: 'UGM',
      jurusan: 'TE',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };

    createIntern(db, intern1);
    createIntern(db, intern2);
    createIntern(db, intern3);
  });

  it('should correctly aggregate attendance, punctuality, and absentees', () => {
    // Zacky: On-time check-in and on-time check-out
    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-zacky',
      date: '2026-10-08',
      checkInTime: '08:20:00',
      status: 'ON_TIME',
      remarks: 'Tepat Waktu',
    });
    recordCheckOut(db, 'intern-zacky', '2026-10-08', {
      checkOutTime: '17:35:00',
      remarks: 'Tepat Waktu | Check-out selesai',
    });

    // Sarah: Late check-in
    recordCheckIn(db, {
      id: 'att-2',
      internId: 'intern-sarah',
      date: '2026-10-08',
      checkInTime: '08:45:00',
      status: 'LATE',
      remarks: 'Terlambat 15 menit',
    });

    // Budi: Did not check-in today -> ABSENT

    const summary = aggregateDailyRecap(db, '2026-10-08');

    assert.equal(summary.date, '2026-10-08');
    assert.equal(summary.totalActive, 3);
    assert.equal(summary.presentCount, 2);
    assert.equal(summary.onTimeCount, 1);
    assert.equal(summary.lateCount, 1);
    assert.equal(summary.absentCount, 1);

    const absentIntern = summary.items.find((i) => i.status === 'ABSENT');
    assert.ok(absentIntern);
    assert.equal(absentIntern.internId, 'intern-budi');

    assert.equal(summary.divisionBreakdowns.length, 2);
    const digitalDiv = summary.divisionBreakdowns.find((d) => d.division === 'Digital Experience');
    assert.ok(digitalDiv);
    assert.equal(digitalDiv.totalInterns, 2);
    assert.equal(digitalDiv.present, 2);
    assert.equal(digitalDiv.absent, 0);
  });

  it('should format WhatsApp daily intern broadcast message', () => {
    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-zacky',
      date: '2026-10-08',
      checkInTime: '08:20:00',
      status: 'ON_TIME',
      remarks: 'Tepat Waktu',
    });

    const summary = aggregateDailyRecap(db, '2026-10-08');
    const text = formatDailyInternsReport(summary);

    assert.match(text, /REKAP PRESENSI MAGANG INDOSAT/i);
    assert.match(text, /2026-10-08/);
    assert.match(text, /Zacky Kurniawan/);
    assert.match(text, /08:20/);
    assert.match(text, /Tepat Waktu/);
    assert.match(text, /Belum Hadir.*Budi Setiawan/s);
  });

  it('should format WhatsApp mentor division recap message', () => {
    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-zacky',
      date: '2026-10-08',
      checkInTime: '08:20:00',
      status: 'ON_TIME',
    });

    const summary = aggregateDailyRecap(db, '2026-10-08');
    const text = formatMentorGroupRecap(summary);

    assert.match(text, /RINGKASAN DIVISI MENTOR/i);
    assert.match(text, /Digital Experience/);
    assert.match(text, /Network Operations/);
  });

  it('should generate valid HTML recap table filtered for specific mentor', () => {
    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-zacky',
      date: '2026-10-08',
      checkInTime: '08:20:00',
      status: 'ON_TIME',
      remarks: 'Tepat Waktu',
    });

    const summary = aggregateDailyRecap(db, '2026-10-08');

    // Filtered for Vicky (only Zacky and Sarah)
    const vickyHtml = generateRecapHtmlTable(summary, 'vicky@indosat.com');
    assert.match(vickyHtml, /<table/i);
    assert.match(vickyHtml, /Zacky Kurniawan/);
    assert.match(vickyHtml, /Sarah Nurhaliza/);
    assert.doesNotMatch(vickyHtml, /Budi Setiawan/);

    // Global supervisor (contains all 3)
    const globalHtml = generateRecapHtmlTable(summary);
    assert.match(globalHtml, /Zacky Kurniawan/);
    assert.match(globalHtml, /Sarah Nurhaliza/);
    assert.match(globalHtml, /Budi Setiawan/);
  });
});
