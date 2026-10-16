import { getDatabase } from '../../../lib/db/client.ts';
import {
  getIntern,
  createIntern,
  listInterns,
  updateInternLocation,
  updateInternMentor,
} from '../../../lib/db/repo.ts';
import { isSupabaseConfigured } from '../../../lib/supabase/admin.ts';
import {
  listInternsFromSupabase,
  createInternInSupabase,
  getInternFromSupabase,
  updateInternMentorInSupabase,
} from '../../../lib/db/supabase-repo.ts';
import type { InternProfile } from '../../../types/index.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status') as 'ACTIVE' | 'COMPLETED' | null;

  if (isSupabaseConfigured()) {
    const supabaseInterns = await listInternsFromSupabase(statusParam || undefined);
    return Response.json(supabaseInterns);
  }

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

    if (isSupabaseConfigured()) {
      const existingInSupabase = await getInternFromSupabase(body.id);
      if (existingInSupabase) {
        return Response.json(
          { error: `Intern with ID ${body.id} already exists` },
          { status: 409 }
        );
      }
      await createInternInSupabase(body);
    }

    const db = getDatabase();
    try {
      const existing = getIntern(db, body.id);
      if (existing && !isSupabaseConfigured()) {
        return Response.json(
          { error: `Intern with ID ${body.id} already exists` },
          { status: 409 }
        );
      }
      createIntern(db, body);
    } catch {}

    return Response.json(body, { status: 201 });
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { internId, locationId, namaMentor, emailMentor } = body;

    if (!internId) {
      return Response.json(
        { error: 'internId wajib disertakan' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      if (namaMentor !== undefined || emailMentor !== undefined) {
        await updateInternMentorInSupabase(
          internId,
          namaMentor || 'Belum Ditugaskan',
          emailMentor || ''
        );
      }
    }

    const db = getDatabase();
    try {
      if (locationId) {
        updateInternLocation(db, internId, locationId);
      }
      if (namaMentor !== undefined || emailMentor !== undefined) {
        updateInternMentor(
          db,
          internId,
          namaMentor || 'Belum Ditugaskan',
          emailMentor || ''
        );
      }
    } catch {}

    return Response.json({
      message: 'Data intern berhasil diperbarui',
      internId,
      namaMentor,
      emailMentor,
      locationId,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
