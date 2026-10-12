import { getDatabase } from '../../../lib/db/client.ts';
import { getIntern, createIntern, listInterns, updateInternLocation } from '../../../lib/db/repo.ts';
import type { InternProfile } from '../../../types/index.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status') as 'ACTIVE' | 'COMPLETED' | null;

  const db = getDatabase();
  const interns = listInterns(db, statusParam || undefined);
  return Response.json(interns);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InternProfile;

    if (
      !body.id ||
      !body.namaLengkap ||
      !body.divisi ||
      !body.namaMentor ||
      !body.emailMentor ||
      !body.universitas ||
      !body.jurusan ||
      !body.periodeMagangSelesai ||
      !body.status
    ) {
      return Response.json(
        { error: 'Missing required intern profile fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const existing = getIntern(db, body.id);
    if (existing) {
      return Response.json(
        { error: `Intern with ID ${body.id} already exists` },
        { status: 409 }
      );
    }

    createIntern(db, body);
    return Response.json(body, { status: 201 });
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { internId, locationId } = body;

    if (!internId || !locationId) {
      return Response.json(
        { error: 'internId dan locationId wajib disertakan' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const intern = getIntern(db, internId);
    if (!intern) {
      return Response.json({ error: `Intern not found with ID: ${internId}` }, { status: 404 });
    }

    updateInternLocation(db, internId, locationId);
    return Response.json({
      message: 'Lokasi kantor berhasil diperbarui',
      internId,
      locationId,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
