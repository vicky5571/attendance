import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import {
  createAttendanceRequest,
  getAttendanceRequestByInternAndDate,
  listAttendanceRequests,
} from '../../../../lib/db/requests-repo.ts';
import type { AttendanceRequest, LeaveType, RequestStatus } from '../../../../types/index.ts';

const VALID_LEAVE_TYPES: LeaveType[] = ['WFH', 'SAKIT', 'IZIN', 'DISPENSASI', 'OFF_SITE'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { internId, date, type, reason, attachmentPath } = body;

    if (!internId || !date || !type || !reason) {
      return Response.json(
        { error: 'Field internId, date, type, dan reason wajib diisi' },
        { status: 400 }
      );
    }

    if (!VALID_LEAVE_TYPES.includes(type)) {
      return Response.json(
        { error: `Tipe pengajuan tidak valid. Pilihan: ${VALID_LEAVE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Verify intern exists
    const intern = getIntern(db, internId);
    if (!intern) {
      return Response.json(
        { error: `Intern dengan ID '${internId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Check duplicate request for same date
    const existing = getAttendanceRequestByInternAndDate(db, internId, date);
    if (existing) {
      return Response.json(
        { error: `Pengajuan presensi untuk tanggal ${date} sudah ada` },
        { status: 409 }
      );
    }

    const newRequest: AttendanceRequest = {
      id: `req-${randomUUID().slice(0, 8)}`,
      internId,
      date,
      type,
      reason,
      attachmentPath: attachmentPath || null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    createAttendanceRequest(db, newRequest);

    return Response.json(
      { message: 'Pengajuan presensi berhasil dikirim', request: newRequest },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const internId = searchParams.get('internId') || undefined;
    const date = searchParams.get('date') || undefined;
    const status = (searchParams.get('status') as RequestStatus) || undefined;

    const db = getDatabase();
    const requests = listAttendanceRequests(db, { internId, date, status });

    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
