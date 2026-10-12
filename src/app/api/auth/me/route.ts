import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { findSessionByToken, getUserById } from '../../../../lib/db/auth-repo.ts';

function extractToken(req: Request): string | null {
  // 1. From cookie header
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith('ioh_session='));
    if (sessionCookie) {
      return sessionCookie.substring('ioh_session='.length);
    }
  }

  // 2. From Authorization header fallback
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring('Bearer '.length);
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) {
      return Response.json(
        { error: 'Tidak terautentikasi (cookie sesi tidak ditemukan)' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const session = findSessionByToken(db, token);
    if (!session) {
      return Response.json(
        { error: 'Sesi telah berakhir atau tidak valid' },
        { status: 401 }
      );
    }

    if (session.role === 'INTERN') {
      const intern = getIntern(db, session.userId);
      if (!intern) {
        return Response.json(
          { error: 'Profil peserta magang tidak ditemukan' },
          { status: 404 }
        );
      }

      return Response.json({
        user: {
          id: intern.id,
          name: intern.namaLengkap,
          role: 'INTERN',
          divisi: intern.divisi,
          emailMentor: intern.emailMentor,
          namaMentor: intern.namaMentor,
        },
      });
    }

    // Role ADMIN or SUPERVISOR
    const user = getUserById(db, session.userId);
    if (!user) {
      return Response.json(
        { error: 'Akun pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
