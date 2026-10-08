import type { DatabaseSync } from 'node:sqlite';
import { listInterns, listAttendanceByDate } from '../db/repo.ts';
import { listAttendanceRequests } from '../db/requests-repo.ts';
import type {
  DailyRecapSummary,
  RecapInternItem,
  DivisionBreakdown,
  AttendanceRecord,
  AttendanceRequest,
} from '../../types/index.ts';

/**
 * Aggregates attendance records, identifies absentees among active interns,
 * integrates approved leave requests, and compiles division-level metrics.
 */
export function aggregateDailyRecap(db: DatabaseSync, date: string): DailyRecapSummary {
  const activeInterns = listInterns(db, 'ACTIVE');
  const logs = listAttendanceByDate(db, date);
  const approvedRequests = listAttendanceRequests(db, { date, status: 'APPROVED' });

  const logMap = new Map<string, AttendanceRecord>();
  for (const log of logs) {
    logMap.set(log.internId, log);
  }

  const reqMap = new Map<string, AttendanceRequest>();
  for (const req of approvedRequests) {
    reqMap.set(req.internId, req);
  }

  const items: RecapInternItem[] = [];
  let presentCount = 0;
  let onTimeCount = 0;
  let lateCount = 0;
  let earlyDepartureCount = 0;
  let wfhCount = 0;
  let sickCount = 0;
  let permitCount = 0;
  let absentCount = 0;

  for (const intern of activeInterns) {
    const log = logMap.get(intern.id);
    const req = reqMap.get(intern.id);

    if (log && log.checkInTime) {
      presentCount++;
      if (log.status === 'ON_TIME') onTimeCount++;
      if (log.status === 'LATE') lateCount++;
      if (log.remarks && log.remarks.toLowerCase().includes('lebih awal')) {
        earlyDepartureCount++;
      }

      items.push({
        internId: intern.id,
        namaLengkap: intern.namaLengkap,
        divisi: intern.divisi,
        namaMentor: intern.namaMentor,
        emailMentor: intern.emailMentor,
        checkInTime: log.checkInTime,
        checkOutTime: log.checkOutTime,
        status: log.status,
        remarks: log.remarks,
      });
    } else if (req) {
      if (req.type === 'WFH') {
        wfhCount++;
        presentCount++;
      } else if (req.type === 'SAKIT') {
        sickCount++;
      } else {
        permitCount++;
      }

      items.push({
        internId: intern.id,
        namaLengkap: intern.namaLengkap,
        divisi: intern.divisi,
        namaMentor: intern.namaMentor,
        emailMentor: intern.emailMentor,
        status: req.type,
        remarks: `${req.type} (Approved): ${req.reason}`,
      });
    } else {
      absentCount++;
      items.push({
        internId: intern.id,
        namaLengkap: intern.namaLengkap,
        divisi: intern.divisi,
        namaMentor: intern.namaMentor,
        emailMentor: intern.emailMentor,
        status: 'ABSENT',
        remarks: 'Belum Hadir / Tanpa Keterangan',
      });
    }
  }

  // Division breakdowns
  const divisionMap = new Map<string, DivisionBreakdown>();
  for (const item of items) {
    let div = divisionMap.get(item.divisi);
    if (!div) {
      div = {
        division: item.divisi,
        totalInterns: 0,
        present: 0,
        absent: 0,
        late: 0,
        wfh: 0,
        sick: 0,
        permit: 0,
      };
      divisionMap.set(item.divisi, div);
    }
    div.totalInterns++;
    if (item.status === 'ABSENT') {
      div.absent++;
    } else if (item.status === 'WFH') {
      div.present++;
      div.wfh = (div.wfh || 0) + 1;
    } else if (item.status === 'SAKIT') {
      div.sick = (div.sick || 0) + 1;
    } else if (item.status === 'IZIN' || item.status === 'DISPENSASI' || item.status === 'OFF_SITE') {
      div.permit = (div.permit || 0) + 1;
    } else {
      div.present++;
      if (item.status === 'LATE') div.late++;
    }
  }

  return {
    date,
    totalActive: activeInterns.length,
    presentCount,
    onTimeCount,
    lateCount,
    earlyDepartureCount,
    wfhCount,
    sickCount,
    permitCount,
    absentCount,
    divisionBreakdowns: Array.from(divisionMap.values()),
    items,
  };
}

/**
 * Formats daily WhatsApp group broadcast text for interns.
 */
export function formatDailyInternsReport(summary: DailyRecapSummary): string {
  const lines: string[] = [
    `📊 *REKAP PRESENSI MAGANG INDOSAT*`,
    `📅 Tanggal: ${summary.date}`,
    `👥 Total: ${summary.totalActive} | Hadir/WFH: ${summary.presentCount} | Izin/Sakit: ${(summary.sickCount || 0) + (summary.permitCount || 0)} | Alpha: ${summary.absentCount}`,
    '',
    `✅ *Daftar Hadir & Remote:*`,
  ];

  const presentItems = summary.items.filter((i) => i.status !== 'ABSENT');
  if (presentItems.length === 0) {
    lines.push('_Belum ada yang melakukan presensi hari ini._');
  } else {
    for (const item of presentItems) {
      if (item.status === 'WFH') {
        lines.push(`• *${item.namaLengkap}* (${item.divisi}) - 🏡 [WFH: ${item.remarks || 'Remote'}]`);
      } else if (item.status === 'SAKIT') {
        lines.push(`• *${item.namaLengkap}* (${item.divisi}) - 🏥 [SAKIT: ${item.remarks || 'Surat Dokter'}]`);
      } else if (item.status === 'IZIN' || item.status === 'DISPENSASI') {
        lines.push(`• *${item.namaLengkap}* (${item.divisi}) - 📝 [IZIN: ${item.remarks || 'Dispensasi'}]`);
      } else {
        const timeIn = item.checkInTime ? item.checkInTime.slice(0, 5) : '-';
        const timeOut = item.checkOutTime ? ` (Pulang: ${item.checkOutTime.slice(0, 5)})` : '';
        const remark = item.remarks ? ` [${item.remarks}]` : '';
        lines.push(`• *${item.namaLengkap}* (${item.divisi}) - ${timeIn}${timeOut}${remark}`);
      }
    }
  }

  lines.push('', `❌ *Belum Hadir / Alpha:*`);
  const absentItems = summary.items.filter((i) => i.status === 'ABSENT');
  if (absentItems.length === 0) {
    lines.push('_Semua intern hadir hari ini._');
  } else {
    for (const item of absentItems) {
      lines.push(`• *${item.namaLengkap}* (${item.divisi})`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats daily WhatsApp mentor group recap with division breakdown.
 */
export function formatMentorGroupRecap(summary: DailyRecapSummary): string {
  const lines: string[] = [
    `📑 *RINGKASAN DIVISI MENTOR - INDOSAT INTERNSHIP*`,
    `📅 Tanggal: ${summary.date}`,
    `📊 Kehadiran Total: ${summary.presentCount}/${summary.totalActive} (${Math.round((summary.presentCount / (summary.totalActive || 1)) * 100)}%)`,
    '',
  ];

  for (const div of summary.divisionBreakdowns) {
    const rate = Math.round((div.present / (div.totalInterns || 1)) * 100);
    lines.push(`🏢 *Divisi: ${div.division}*`);
    lines.push(`  • Kehadiran: ${div.present}/${div.totalInterns} (${rate}%)`);
    lines.push(`  • Tepat Waktu / Hadir: ${div.present}`);
    lines.push(`  • Terlambat: ${div.late}`);
    lines.push(`  • Belum Hadir: ${div.absent}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Generates an HTML recap table suitable for email digest delivery.
 */
export function generateRecapHtmlTable(summary: DailyRecapSummary, filterMentorEmail?: string): string {
  const items = filterMentorEmail
    ? summary.items.filter((i) => i.emailMentor.toLowerCase() === filterMentorEmail.toLowerCase())
    : summary.items;

  const rows = items
    .map((item) => {
      const statusBadge =
        item.status === 'ABSENT'
          ? `<span style="color: #ef4444; font-weight: bold;">TIDAK HADIR</span>`
          : item.status === 'WFH'
          ? `<span style="color: #0284c7; font-weight: bold;">WFH</span>`
          : item.status === 'SAKIT'
          ? `<span style="color: #d97706; font-weight: bold;">SAKIT</span>`
          : item.status === 'IZIN' || item.status === 'DISPENSASI'
          ? `<span style="color: #7c3aed; font-weight: bold;">IZIN</span>`
          : item.status === 'LATE'
          ? `<span style="color: #f59e0b; font-weight: bold;">TERLAMBAT</span>`
          : `<span style="color: #10b981; font-weight: bold;">HADIR</span>`;

      return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 12px; font-weight: 500;">${item.namaLengkap}</td>
        <td style="padding: 10px 12px; color: #4b5563;">${item.divisi}</td>
        <td style="padding: 10px 12px;">${item.checkInTime || '-'}</td>
        <td style="padding: 10px 12px;">${item.checkOutTime || '-'}</td>
        <td style="padding: 10px 12px;">${statusBadge}</td>
        <td style="padding: 10px 12px; color: #6b7280; font-size: 13px;">${item.remarks || '-'}</td>
      </tr>`;
    })
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 20px; background-color: #f9fafb;">
    <div style="max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 24px;">
      <h2 style="color: #ed1c24; margin-top: 0;">Laporan Presensi Magang Indosat Ooredoo Hutchison</h2>
      <p style="margin: 4px 0 16px 0; color: #6b7280;">Tanggal: <strong>${summary.date}</strong></p>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6; color: #374151;">
            <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb;">Nama Lengkap</th>
            <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb;">Divisi</th>
            <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb;">Masuk</th>
            <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb;">Keluar</th>
            <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb;">Status</th>
            <th style="padding: 10px 12px; border-bottom: 2px solid #e5e7eb;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
        Sistem Presensi Otomatis Indosat PWA • Dikirim secara otomatis setiap pukul 18:00 WIB.
      </p>
    </div>
  </body>
  </html>
  `.trim();
}
