import type { DatabaseSync } from 'node:sqlite';
import type { AttendanceRequest, RequestStatus, LeaveType } from '../../types/index.ts';

interface AttendanceRequestRow {
  id: string;
  intern_id: string;
  date: string;
  type: LeaveType;
  reason: string;
  attachment_path: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function mapRequestRow(row: AttendanceRequestRow): AttendanceRequest {
  return {
    id: row.id,
    internId: row.intern_id,
    date: row.date,
    type: row.type,
    reason: row.reason,
    attachmentPath: row.attachment_path,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export function createAttendanceRequest(db: DatabaseSync, req: AttendanceRequest): AttendanceRequest {
  const stmt = db.prepare(`
    INSERT INTO attendance_requests (
      id, intern_id, date, type, reason, attachment_path,
      status, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    req.id,
    req.internId,
    req.date,
    req.type,
    req.reason,
    req.attachmentPath || null,
    req.status,
    req.reviewedBy || null,
    req.reviewedAt || null,
    req.createdAt
  );
  return req;
}

export function getAttendanceRequestById(db: DatabaseSync, id: string): AttendanceRequest | null {
  const stmt = db.prepare('SELECT * FROM attendance_requests WHERE id = ?');
  const row = stmt.get(id) as unknown as AttendanceRequestRow | undefined;
  return row ? mapRequestRow(row) : null;
}

export function getAttendanceRequestByInternAndDate(
  db: DatabaseSync,
  internId: string,
  date: string
): AttendanceRequest | null {
  const stmt = db.prepare('SELECT * FROM attendance_requests WHERE intern_id = ? AND date = ?');
  const row = stmt.get(internId, date) as unknown as AttendanceRequestRow | undefined;
  return row ? mapRequestRow(row) : null;
}

export function listAttendanceRequests(
  db: DatabaseSync,
  filter?: { internId?: string; date?: string; status?: RequestStatus }
): AttendanceRequest[] {
  let query = 'SELECT * FROM attendance_requests WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.internId) {
    query += ' AND intern_id = ?';
    params.push(filter.internId);
  }
  if (filter?.date) {
    query += ' AND date = ?';
    params.push(filter.date);
  }
  if (filter?.status) {
    query += ' AND status = ?';
    params.push(filter.status);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as unknown as AttendanceRequestRow[];
  return rows.map(mapRequestRow);
}

export function updateAttendanceRequestStatus(
  db: DatabaseSync,
  id: string,
  status: RequestStatus,
  reviewedBy?: string
): AttendanceRequest | null {
  const existing = getAttendanceRequestById(db, id);
  if (!existing) return null;

  const reviewedAt = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE attendance_requests
    SET status = ?, reviewed_by = ?, reviewed_at = ?
    WHERE id = ?
  `);
  stmt.run(status, reviewedBy || null, reviewedAt, id);

  return {
    ...existing,
    status,
    reviewedBy: reviewedBy || null,
    reviewedAt,
  };
}
