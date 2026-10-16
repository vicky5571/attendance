import { getDatabase } from '../../../../lib/db/client.ts';
import { deleteSession } from '../../../../lib/db/auth-repo.ts';
import { isSupabaseConfigured } from '../../../../lib/supabase/admin.ts';
import { deleteSessionFromSupabase } from '../../../../lib/db/supabase-repo.ts';

function extractToken(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith('ioh_session='));
    if (sessionCookie) {
      return sessionCookie.substring('ioh_session='.length);
    }
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring('Bearer '.length);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const token = extractToken(req);
    if (token) {
      if (isSupabaseConfigured()) {
        await deleteSessionFromSupabase(token);
      }
      try {
        const db = getDatabase();
        deleteSession(db, token);
      } catch {}
    }

    return Response.json(
      { message: 'Berhasil keluar dari sistem' },
      {
        status: 200,
        headers: {
          'Set-Cookie': 'ioh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
