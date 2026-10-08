import type { DatabaseSync } from 'node:sqlite';
import type {
  OfficeConfig,
  InternProfile,
  AttendanceRecord,
  Coordinates,
} from '../../types/index.ts';

// Row interfaces for SQLite storage
interface OfficeConfigRow {
  id: number;
  target_latitude: number;
  target_longitude: number;
  max_radius_meters: number;
  work_start_time: string;
  work_end_time: string;
  email_atasan: string;
  wa_group_interns_jid: string | null;
  wa_group_mentors_jid: string | null;
}

interface InternRow {
  id: string;
  nama_lengkap: string;
  divisi: string;
  nama_mentor: string;
  email_mentor: string;
  universitas: string;
  jurusan: string;
  periode_magang_selesai: string;
  status: 'ACTIVE' | 'COMPLETED';
  pin_hash?: string | null;
}

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

function mapOfficeConfigRow(row: OfficeConfigRow): OfficeConfig {
  const config: OfficeConfig = {
    targetLatitude: row.target_latitude,
    targetLongitude: row.target_longitude,
    maxRadiusMeters: row.max_radius_meters,
    workStartTime: row.work_start_time,
    workEndTime: row.work_end_time,
    emailAtasan: row.email_atasan,
  };
  if (row.wa_group_interns_jid) {
    config.waGroupInternsJid = row.wa_group_interns_jid;
  }
  if (row.wa_group_mentors_jid) {
    config.waGroupMentorsJid = row.wa_group_mentors_jid;
  }
  return config;
}

function mapInternRow(row: InternRow): InternProfile {
  const profile: InternProfile = {
    id: row.id,
    namaLengkap: row.nama_lengkap,
    divisi: row.divisi,
    namaMentor: row.nama_mentor,
    emailMentor: row.email_mentor,
    universitas: row.universitas,
    jurusan: row.jurusan,
    periodeMagangSelesai: row.periode_magang_selesai,
    status: row.status,
  };
  if (row.pin_hash) profile.pinHash = row.pin_hash;
  return profile;
}

function mapAttendanceRow(row: AttendanceRow): AttendanceRecord {
  const record: AttendanceRecord = {
    id: row.id,
    internId: row.intern_id,
    date: row.date,
    status: row.status,
  };
  if (row.check_in_time) record.checkInTime = row.check_in_time;
  if (row.check_out_time) record.checkOutTime = row.check_out_time;
  if (row.check_in_lat !== null && row.check_in_lng !== null) {
    record.checkInCoords = { latitude: row.check_in_lat, longitude: row.check_in_lng };
  }
  if (row.check_out_lat !== null && row.check_out_lng !== null) {
    record.checkOutCoords = { latitude: row.check_out_lat, longitude: row.check_out_lng };
  }
  if (row.distance_in_meters !== null) record.distanceInMeters = row.distance_in_meters;
  if (row.remarks) record.remarks = row.remarks;
  if (row.location_id) record.locationId = row.location_id;
  if (row.photo_url) record.photoUrl = row.photo_url;

  return record;
}

// ----------------------------------------------------
// OfficeConfig Operations
// ----------------------------------------------------

export function getOfficeConfig(db: DatabaseSync): OfficeConfig | null {
  const stmt = db.prepare('SELECT * FROM office_config WHERE id = 1');
  const row = stmt.get() as unknown as OfficeConfigRow | undefined;
  return row ? mapOfficeConfigRow(row) : null;
}

export function setOfficeConfig(db: DatabaseSync, config: OfficeConfig): void {
  const stmt = db.prepare(`
    INSERT INTO office_config (
      id, target_latitude, target_longitude, max_radius_meters,
      work_start_time, work_end_time, email_atasan,
      wa_group_interns_jid, wa_group_mentors_jid
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      target_latitude = excluded.target_latitude,
      target_longitude = excluded.target_longitude,
      max_radius_meters = excluded.max_radius_meters,
      work_start_time = excluded.work_start_time,
      work_end_time = excluded.work_end_time,
      email_atasan = excluded.email_atasan,
      wa_group_interns_jid = excluded.wa_group_interns_jid,
      wa_group_mentors_jid = excluded.wa_group_mentors_jid
  `);
  stmt.run(
    config.targetLatitude,
    config.targetLongitude,
    config.maxRadiusMeters,
    config.workStartTime,
    config.workEndTime,
    config.emailAtasan,
    config.waGroupInternsJid || null,
    config.waGroupMentorsJid || null
  );
}

// ----------------------------------------------------
// InternProfile Operations
// ----------------------------------------------------

export function createIntern(db: DatabaseSync, intern: InternProfile): void {
  const stmt = db.prepare(`
    INSERT INTO interns (
      id, nama_lengkap, divisi, nama_mentor, email_mentor,
      universitas, jurusan, periode_magang_selesai, status, pin_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    intern.id,
    intern.namaLengkap,
    intern.divisi,
    intern.namaMentor,
    intern.emailMentor,
    intern.universitas,
    intern.jurusan,
    intern.periodeMagangSelesai,
    intern.status,
    intern.pinHash || null
  );
}

export function getIntern(db: DatabaseSync, id: string): InternProfile | null {
  const stmt = db.prepare('SELECT * FROM interns WHERE id = ?');
  const row = stmt.get(id) as unknown as InternRow | undefined;
  return row ? mapInternRow(row) : null;
}

export function listInterns(db: DatabaseSync, status?: 'ACTIVE' | 'COMPLETED'): InternProfile[] {
  if (status) {
    const stmt = db.prepare('SELECT * FROM interns WHERE status = ? ORDER BY nama_lengkap ASC');
    const rows = stmt.all(status) as unknown as InternRow[];
    return rows.map(mapInternRow);
  }
  const stmt = db.prepare('SELECT * FROM interns ORDER BY nama_lengkap ASC');
  const rows = stmt.all() as unknown as InternRow[];
  return rows.map(mapInternRow);
}

// ----------------------------------------------------
// AttendanceRecord Operations
// ----------------------------------------------------

export function recordCheckIn(db: DatabaseSync, record: AttendanceRecord): void {
  const stmt = db.prepare(`
    INSERT INTO attendance_logs (
      id, intern_id, date, check_in_time, check_out_time,
      check_in_lat, check_in_lng, check_out_lat, check_out_lng,
      distance_in_meters, status, remarks, location_id, photo_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id,
    record.internId,
    record.date,
    record.checkInTime || null,
    record.checkOutTime || null,
    record.checkInCoords?.latitude ?? null,
    record.checkInCoords?.longitude ?? null,
    record.checkOutCoords?.latitude ?? null,
    record.checkOutCoords?.longitude ?? null,
    record.distanceInMeters ?? null,
    record.status,
    record.remarks || null,
    record.locationId || null,
    record.photoUrl || null
  );
}

export function recordCheckOut(
  db: DatabaseSync,
  internId: string,
  date: string,
  data: {
    checkOutTime: string;
    checkOutCoords?: Coordinates;
    remarks?: string;
  }
): AttendanceRecord {
  const existing = getAttendanceRecord(db, internId, date);
  if (!existing) {
    throw new Error(`No check-in record found for intern ${internId} on date ${date}`);
  }

  const stmt = db.prepare(`
    UPDATE attendance_logs
    SET check_out_time = ?,
        check_out_lat = ?,
        check_out_lng = ?,
        remarks = ?
    WHERE intern_id = ? AND date = ?
  `);

  stmt.run(
    data.checkOutTime,
    data.checkOutCoords?.latitude ?? null,
    data.checkOutCoords?.longitude ?? null,
    data.remarks ?? existing.remarks ?? null,
    internId,
    date
  );

  return getAttendanceRecord(db, internId, date)!;
}

export function getAttendanceRecord(
  db: DatabaseSync,
  internId: string,
  date: string
): AttendanceRecord | null {
  const stmt = db.prepare('SELECT * FROM attendance_logs WHERE intern_id = ? AND date = ?');
  const row = stmt.get(internId, date) as unknown as AttendanceRow | undefined;
  return row ? mapAttendanceRow(row) : null;
}

export function listAttendanceByDate(db: DatabaseSync, date: string): AttendanceRecord[] {
  const stmt = db.prepare('SELECT * FROM attendance_logs WHERE date = ? ORDER BY check_in_time ASC');
  const rows = stmt.all(date) as unknown as AttendanceRow[];
  return rows.map(mapAttendanceRow);
}
