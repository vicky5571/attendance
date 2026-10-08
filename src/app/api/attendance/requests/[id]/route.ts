import { getDatabase } from '../../../../../lib/db/client.ts';
import { updateAttendanceRequestStatus, getAttendanceRequestById } from '../../../../../lib/db/requests-repo.ts';
import type { RequestStatus } from '../../../../../types/index.ts';

const VALID_STATUSES: RequestStatus[] = ['APPROVED', 'REJECTED', 'PENDING'];

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, reviewedBy } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return Response.json(
        { error: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const existing = getAttendanceRequestById(db, id);
    if (!existing) {
      return Response.json(
        { error: `Pengajuan presensi dengan ID '${id}' tidak ditemukan` },
        { status: 404 }
      );
    }

    const updated = updateAttendanceRequestStatus(db, id, status, reviewedBy);

    return Response.json(
      { message: `Pengajuan presensi berhasil di-${status.toLowerCase()}`, request: updated },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
