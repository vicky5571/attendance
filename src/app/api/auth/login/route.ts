import { randomUUID, randomBytes } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { getUserByEmail, createSession } from '../../../../lib/db/auth-repo.ts';
import { verifyPin, verifyPassword } from '../../../../lib/auth.ts';

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
import type { SessionRecord, UserRole } from '../../../../types/index.ts';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.role) {
      return Response.json(
        { error: 'Field "role" wajib diisi (INTERN, ADMIN, atau SUPERVISOR)' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();

    // 1. Intern Login Mode (ID + PIN)
    if (body.role === 'INTERN') {
      const { internId, pin } = body;
      if (!internId || !pin) {
        return Response.json(
          { error: 'Field internId dan pin wajib diisi untuk login peserta magang' },
          { status: 400 }
        );
      }

      const intern = getIntern(db, internId);
      if (!intern) {
        return Response.json(
          { error: `Peserta magang dengan ID '${internId}' tidak ditemukan` },
          { status: 404 }
        );
      }

      // If intern has configured PIN, verify it
      if (intern.pinHash && !verifyPin(pin, intern.pinHash)) {
        return Response.json(
          { error: 'PIN yang dimasukkan salah' },
          { status: 401 }
        );
      }

      const token = generateSessionToken();
      const session: SessionRecord = {
        id: `sess-${randomUUID().slice(0, 8)}`,
        userId: intern.id,
        role: 'INTERN',
        token,
        expiresAt,
        createdAt: now.toISOString(),
      };
      createSession(db, session);

      const cookieHeader = `ioh_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;

      return Response.json(
        {
          message: 'Login berhasil',
          user: {
            id: intern.id,
            name: intern.namaLengkap,
            role: 'INTERN' as UserRole,
            divisi: intern.divisi,
          },
        },
        {
          status: 200,
          headers: {
            'Set-Cookie': cookieHeader,
          },
        }
      );
    }

    // 2. Administrator / Supervisor Login Mode (Email + Password)
    if (body.role === 'ADMIN' || body.role === 'SUPERVISOR') {
      const { email, password } = body;
      if (!email || !password) {
        return Response.json(
          { error: 'Field email dan password wajib diisi untuk login administrator' },
          { status: 400 }
        );
      }

      const user = getUserByEmail(db, email);
      if (!user) {
        return Response.json(
          { error: 'Email atau password yang dimasukkan salah' },
          { status: 401 }
        );
      }

      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return Response.json(
          { error: 'Email atau password yang dimasukkan salah' },
          { status: 401 }
        );
      }

      const token = generateSessionToken();
      const session: SessionRecord = {
        id: `sess-${randomUUID().slice(0, 8)}`,
        userId: user.id,
        role: user.role,
        token,
        expiresAt,
        createdAt: now.toISOString(),
      };
      createSession(db, session);

      const cookieHeader = `ioh_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;

      return Response.json(
        {
          message: 'Login berhasil',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        {
          status: 200,
          headers: {
            'Set-Cookie': cookieHeader,
          },
        }
      );
    }

    return Response.json(
      { error: `Role '${body.role}' tidak valid. Pilihan: INTERN, ADMIN, SUPERVISOR` },
      { status: 400 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
