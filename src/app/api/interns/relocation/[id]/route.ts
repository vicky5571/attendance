import { getDatabase } from '../../../../../lib/db/client.ts';
import {
  getRelocationRequestById,
  reviewRelocationRequest,
} from '../../../../../lib/db/relocation-repo.ts';
import { checkRoleIfAuthenticated } from '../../../../../lib/auth-guard.ts';
import type { RelocationStatus } from '../../../../../types/index.ts';

const VALID_REVIEW_STATUSES: RelocationStatus[] = ['APPROVED', 'REJECTED'];

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, reviewedBy, rejectionReason } = body;

    if (!status || !VALID_REVIEW_STATUSES.includes(status)) {
      return Response.json(
        { error: `Status tidak valid. Pilihan: ${VALID_REVIEW_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Enforce administrative role if authenticated
    const roleCheck = checkRoleIfAuthenticated(req, db, ['ADMIN', 'SUPERVISOR']);
    if (!roleCheck.allowed && roleCheck.errorResponse) {
      return roleCheck.errorResponse;
    }

    const existing = getRelocationRequestById(db, id);
    if (!existing) {
      return Response.json(
        { error: `Pengajuan pindah kantor dengan ID '${id}' tidak ditemukan` },
        { status: 404 }
      );
    }

    const updated = reviewRelocationRequest(
      db,
      id,
      status,
      reviewedBy || 'System',
      status === 'REJECTED' ? rejectionReason : undefined
    );

    return Response.json(
      {
        message: `Pengajuan pindah kantor berhasil di-${status.toLowerCase()}`,
        request: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
