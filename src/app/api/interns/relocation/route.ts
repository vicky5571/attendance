import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { getOfficeLocationById } from '../../../../lib/db/locations-repo.ts';
import {
  createRelocationRequest,
  listRelocationRequests,
  getPendingRelocationForIntern,
} from '../../../../lib/db/relocation-repo.ts';
import { enforceInternIdentity } from '../../../../lib/auth-guard.ts';
import type { RelocationRequest, RelocationStatus } from '../../../../types/index.ts';

interface RelocationPayload {
  internId: string;
  currentLocationId: string;
  targetLocationId: string;
  reason: string;
  notes?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RelocationPayload;

    if (!body.internId || !body.currentLocationId || !body.targetLocationId || !body.reason) {
      return Response.json(
        { error: 'Field internId, currentLocationId, targetLocationId, dan reason wajib diisi' },
        { status: 400 }
      );
    }

    if (body.reason.trim().length === 0) {
      return Response.json(
        { error: 'Alasan pindah kantor wajib diisi' },
        { status: 400 }
      );
    }

    if (body.currentLocationId === body.targetLocationId) {
      return Response.json(
        { error: 'Kantor tujuan tidak boleh sama dengan kantor saat ini' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Zero-impersonation guard
    const identityCheck = enforceInternIdentity(req, db, body.internId);
    if (!identityCheck.allowed && identityCheck.errorResponse) {
      return identityCheck.errorResponse;
    }

    // Verify intern exists
    const intern = getIntern(db, body.internId);
    if (!intern) {
      return Response.json(
        { error: `Peserta magang dengan ID '${body.internId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Verify target location exists
    const targetLocation = getOfficeLocationById(db, body.targetLocationId);
    if (!targetLocation) {
      return Response.json(
        { error: `Lokasi kantor tujuan dengan ID '${body.targetLocationId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Verify current location exists
    const currentLocation = getOfficeLocationById(db, body.currentLocationId);
    if (!currentLocation) {
      return Response.json(
        { error: `Lokasi kantor asal dengan ID '${body.currentLocationId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Check for existing pending request
    const existingPending = getPendingRelocationForIntern(db, body.internId);
    if (existingPending) {
      return Response.json(
        { error: 'Anda masih memiliki pengajuan pindah kantor yang sedang Menunggu Persetujuan' },
        { status: 409 }
      );
    }

    const newRequest: RelocationRequest = {
      id: `reloc-${randomUUID().slice(0, 8)}`,
      internId: body.internId,
      currentLocationId: body.currentLocationId,
      targetLocationId: body.targetLocationId,
      reason: body.reason.trim(),
      notes: body.notes?.trim() || null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    createRelocationRequest(db, newRequest);

    return Response.json(
      { message: 'Pengajuan pindah kantor berhasil dikirim', request: newRequest },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const internId = searchParams.get('internId') || undefined;
    const status = (searchParams.get('status') as RelocationStatus) || undefined;

    const db = getDatabase();
    const requests = listRelocationRequests(db, { internId, status });

    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
