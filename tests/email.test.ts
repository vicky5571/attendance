import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchEmailRecap, createMockTransporter } from '../src/lib/services/email.ts';
import type { DailyRecapSummary } from '../src/types/index.ts';

describe('Email Notification Engine (Nodemailer)', () => {
  const sampleSummary: DailyRecapSummary = {
    date: '2026-10-08',
    totalActive: 3,
    presentCount: 2,
    onTimeCount: 1,
    lateCount: 1,
    earlyDepartureCount: 0,
    absentCount: 1,
    divisionBreakdowns: [
      { division: 'Digital Experience', totalInterns: 2, present: 2, absent: 0, late: 1 },
      { division: 'Network Operations', totalInterns: 1, present: 0, absent: 1, late: 0 },
    ],
    items: [
      {
        internId: 'intern-zacky',
        namaLengkap: 'Zacky Kurniawan',
        divisi: 'Digital Experience',
        namaMentor: 'Vicky Lead',
        emailMentor: 'vicky@indosat.com',
        checkInTime: '08:20:00',
        status: 'ON_TIME',
        remarks: 'Tepat Waktu',
      },
      {
        internId: 'intern-sarah',
        namaLengkap: 'Sarah Nurhaliza',
        divisi: 'Digital Experience',
        namaMentor: 'Vicky Lead',
        emailMentor: 'vicky@indosat.com',
        checkInTime: '08:45:00',
        status: 'LATE',
        remarks: 'Terlambat 15 menit',
      },
      {
        internId: 'intern-budi',
        namaLengkap: 'Budi Setiawan',
        divisi: 'Network Operations',
        namaMentor: 'Anton Lead',
        emailMentor: 'anton@indosat.com',
        status: 'ABSENT',
        remarks: 'Belum Hadir / Tanpa Keterangan',
      },
    ],
  };

  it('should dispatch emails to supervisor and all distinct mentors', async () => {
    const { transporter, sentMessages } = createMockTransporter();

    const result = await dispatchEmailRecap(sampleSummary, {
      supervisorEmail: 'supervisor@indosat.com',
      transporter,
    });

    // 1 email to supervisor + 1 email to Vicky + 1 email to Anton = 3 emails total
    assert.equal(result.sentCount, 3);
    assert.equal(result.errors.length, 0);
    assert.equal(sentMessages.length, 3);

    const supervisorMail = sentMessages.find((m) => m.to === 'supervisor@indosat.com');
    assert.ok(supervisorMail);
    assert.match(supervisorMail.subject, /Rekap Presensi Magang/i);
    assert.match(supervisorMail.html, /Zacky Kurniawan/);
    assert.match(supervisorMail.html, /Budi Setiawan/);

    const vickyMail = sentMessages.find((m) => m.to === 'vicky@indosat.com');
    assert.ok(vickyMail);
    assert.match(vickyMail.html, /Zacky Kurniawan/);
    assert.match(vickyMail.html, /Sarah Nurhaliza/);
    assert.doesNotMatch(vickyMail.html, /Budi Setiawan/); // filtered out

    const antonMail = sentMessages.find((m) => m.to === 'anton@indosat.com');
    assert.ok(antonMail);
    assert.match(antonMail.html, /Budi Setiawan/);
    assert.doesNotMatch(antonMail.html, /Zacky Kurniawan/);
  });
});
