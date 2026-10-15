import { getDatabase } from '../../../../../lib/db/client.ts';
import {
  createRelocationRequest,
  getRelocationRequestById,
  reviewRelocationRequest,
} from '../../../../../lib/db/relocation-repo.ts';
import { getIntern, createIntern } from '../../../../../lib/db/repo.ts';
import { getOfficeLocationById, createOfficeLocation } from '../../../../../lib/db/locations-repo.ts';
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

    let existing = getRelocationRequestById(db, id);
    if (!existing && id === 'reloc-init-01') {
      if (!getOfficeLocationById(db, 'loc-kppti')) {
        createOfficeLocation(db, {
          id: 'loc-kppti',
          name: 'KPPTI Jakarta Pusat (HQ)',
          latitude: -6.180495,
          longitude: 106.822769,
          maxRadiusMeters: 50,
          isActive: true,
        });
      }
      if (!getOfficeLocationById(db, 'loc-bsd')) {
        createOfficeLocation(db, {
          id: 'loc-bsd',
          name: 'Gedung Indosat Serpong BSD',
          latitude: -6.301540,
          longitude: 106.652170,
          maxRadiusMeters: 75,
          isActive: true,
        });
      }
      if (!getIntern(db, 'intern-zacky')) {
        createIntern(db, {
          id: 'intern-zacky',
          namaLengkap: 'Zacky Kurniawan',
          divisi: 'Digital Experience & Frontend',
          namaMentor: 'Vicky Backend Lead',
          emailMentor: 'mentor.vicky@indosat.com',
          universitas: 'Universitas Indonesia',
          jurusan: 'Sistem Informasi',
          periodeMagangSelesai: '2026-12-31',
          status: 'ACTIVE',
        });
      }

      createRelocationRequest(db, {
        id: 'reloc-init-01',
        internId: 'intern-zacky',
        currentLocationId: 'loc-kppti',
        targetLocationId: 'loc-bsd',
        reason: 'Pindah domisili ke Tangerang Selatan agar lebih dekat dengan lokasi kerja tim Network.',
        notes: 'Sudah berkoordinasi dengan mentor Vicky.',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      });
      existing = getRelocationRequestById(db, id);
    }

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

