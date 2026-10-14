import type { DatabaseSync } from 'node:sqlite';
import type { RelocationRequest, RelocationStatus } from '../../types/index.ts';
import { updateInternLocation } from './repo.ts';

interface RelocationRequestRow {
  id: string;
  intern_id: string;
  current_location_id: string;
  target_location_id: string;
  reason: string;
  notes: string | null;
  status: RelocationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function mapRelocationRow(row: RelocationRequestRow): RelocationRequest {
  return {
    id: row.id,
    internId: row.intern_id,
    currentLocationId: row.current_location_id,
    targetLocationId: row.target_location_id,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export function createRelocationRequest(
  db: DatabaseSync,
  req: RelocationRequest
): RelocationRequest {
  const stmt = db.prepare(`
    INSERT INTO relocation_requests (
      id, intern_id, current_location_id, target_location_id,
      reason, notes, status, rejection_reason, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    req.id,
    req.internId,
    req.currentLocationId,
    req.targetLocationId,
    req.reason,
    req.notes || null,
    req.status,
    req.rejectionReason || null,
    req.reviewedBy || null,
    req.reviewedAt || null,
    req.createdAt
  );
  return req;
}

export function getRelocationRequestById(
  db: DatabaseSync,
  id: string
): RelocationRequest | null {
  const stmt = db.prepare('SELECT * FROM relocation_requests WHERE id = ?');
  const row = stmt.get(id) as unknown as RelocationRequestRow | undefined;
  return row ? mapRelocationRow(row) : null;
}

export function getPendingRelocationForIntern(
  db: DatabaseSync,
  internId: string
): RelocationRequest | null {
  const stmt = db.prepare(
    "SELECT * FROM relocation_requests WHERE intern_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1"
  );
  const row = stmt.get(internId) as unknown as RelocationRequestRow | undefined;
  return row ? mapRelocationRow(row) : null;
}

export function listRelocationRequests(
  db: DatabaseSync,
  filter?: { internId?: string; status?: RelocationStatus }
): RelocationRequest[] {
  let query = 'SELECT * FROM relocation_requests WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.internId) {
    query += ' AND intern_id = ?';
    params.push(filter.internId);
  }
  if (filter?.status) {
    query += ' AND status = ?';
    params.push(filter.status);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as unknown as RelocationRequestRow[];
  return rows.map(mapRelocationRow);
}

export function reviewRelocationRequest(
  db: DatabaseSync,
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewedBy: string,
  rejectionReason?: string
): RelocationRequest | null {
  const existing = getRelocationRequestById(db, id);
  if (!existing) return null;

  const reviewedAt = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE relocation_requests
    SET status = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = ?
    WHERE id = ?
  `);
  stmt.run(
    status,
    reviewedBy,
    reviewedAt,
    status === 'REJECTED' ? (rejectionReason || null) : null,
    id
  );

  // On approval, atomically update intern's assigned office location
  if (status === 'APPROVED') {
    updateInternLocation(db, existing.internId, existing.targetLocationId);
  }

  return getRelocationRequestById(db, id);
}
