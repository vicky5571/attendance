import type { MonthlyTimesheetSummary, InternProfile } from '../../types/index.ts';

function calculateHours(inTime?: string, outTime?: string): number {
  if (!inTime || !outTime) return 0;
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  const diffMinutes = Math.max(0, outH * 60 + outM - (inH * 60 + inM));
  return Math.round((diffMinutes / 60) * 10) / 10;
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function generateMonthlyCsv(
  summary: MonthlyTimesheetSummary,
  intern: InternProfile
): string {
  const headers = [
    'ID Intern',
    'Nama Lengkap',
    'Divisi',
    'Tanggal',
    'Jam Masuk',
    'Jam Keluar',
    'Status',
    'Total Jam',
    'Keterangan',
  ];

  const rows: string[] = [headers.join(',')];

  // Map of physical logs
  const logDates = new Set<string>();
  for (const r of summary.records) {
    logDates.add(r.date);
    const hours = calculateHours(r.checkInTime, r.checkOutTime);
    rows.push([
      escapeCsv(intern.id),
      escapeCsv(intern.namaLengkap),
      escapeCsv(intern.divisi),
      r.date,
      r.checkInTime || '-',
      r.checkOutTime || '-',
      r.status,
      hours > 0 ? `${hours}` : '-',
      escapeCsv(r.remarks || '-'),
    ].join(','));
  }

  // Include approved leave requests without punch
  for (const req of summary.requests) {
    if (req.status === 'APPROVED' && !logDates.has(req.date)) {
      rows.push([
        escapeCsv(intern.id),
        escapeCsv(intern.namaLengkap),
        escapeCsv(intern.divisi),
        req.date,
        '-',
        '-',
        req.type,
        '-',
        escapeCsv(`${req.type} (Approved): ${req.reason}`),
      ].join(','));
    }
  }

  return rows.join('\n');
}
