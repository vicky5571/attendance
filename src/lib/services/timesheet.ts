import type { DatabaseSync } from 'node:sqlite';
import { listAttendanceRequests } from '../db/requests-repo.ts';
import type {
  MonthlyTimesheetSummary,
  AttendanceRecord,
  AttendanceRequest,
} from '../../types/index.ts';

interface AttendanceRow {
  id: string;
  intern_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  distance_in_meters: number | null;
  status: AttendanceRecord['status'];
  remarks: string | null;
  location_id: string | null;
  photo_url: string | null;
}

function calculateHoursDifference(inTime: string, outTime: string): number {
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  const diffMinutes = Math.max(0, outMinutes - inMinutes);
  return Math.round((diffMinutes / 60) * 10) / 10;
}

export function calculateMonthlyTimesheet(
  db: DatabaseSync,
  internId: string,
  month: string // e.g. "2026-10"
): { summary: MonthlyTimesheetSummary; records: AttendanceRecord[]; requests: AttendanceRequest[] } {
  // 1. Fetch attendance records for the month
  const stmt = db.prepare(`
    SELECT * FROM attendance_logs
    WHERE intern_id = ? AND date LIKE ?
    ORDER BY date ASC
  `);
  const rows = stmt.all(internId, `${month}%`) as unknown as AttendanceRow[];

  const records: AttendanceRecord[] = rows.map((row) => ({
    id: row.id,
    internId: row.intern_id,
    date: row.date,
    checkInTime: row.check_in_time || undefined,
    checkOutTime: row.check_out_time || undefined,
    checkInCoords: row.check_in_lat && row.check_in_lng
      ? { latitude: row.check_in_lat, longitude: row.check_in_lng }
      : undefined,
    checkOutCoords: row.check_out_lat && row.check_out_lng
      ? { latitude: row.check_out_lat, longitude: row.check_out_lng }
      : undefined,
    distanceInMeters: row.distance_in_meters ?? undefined,
    locationId: row.location_id ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    status: row.status,
    remarks: row.remarks || undefined,
  }));

  // 2. Fetch approved leave requests for the month
  const allRequests = listAttendanceRequests(db, { internId });
  const requests = allRequests.filter((r) => r.date.startsWith(month));

  // 3. Compute metrics
  let totalWorkHours = 0;
  let onTimeDays = 0;
  let lateDays = 0;
  let earlyDepartureDays = 0;

  for (const r of records) {
    if (r.status === 'ON_TIME') onTimeDays++;
    if (r.status === 'LATE') lateDays++;
    if (r.status === 'EARLY_DEPARTURE') earlyDepartureDays++;

    if (r.checkInTime && r.checkOutTime) {
      totalWorkHours += calculateHoursDifference(r.checkInTime, r.checkOutTime);
    }
  }

  const presentDays = records.length;
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const wfhDays = approvedRequests.filter((r) => r.type === 'WFH').length;
  const sickDays = approvedRequests.filter((r) => r.type === 'SAKIT').length;
  const permitDays = approvedRequests.filter((r) => r.type === 'IZIN' || r.type === 'DISPENSASI').length;
  const totalWorkDays = presentDays + wfhDays;

  const punctualityRate =
    presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 100;

  const summary: MonthlyTimesheetSummary = {
    internId,
    month,
    totalWorkDays,
    presentDays,
    onTimeDays,
    lateDays,
    earlyDepartureDays,
    wfhDays,
    sickDays,
    permitDays,
    absentDays: 0,
    totalWorkHours: Math.round(totalWorkHours * 10) / 10,
    punctualityRate,
    records,
    requests,
  };

  return { summary, records, requests };
}
