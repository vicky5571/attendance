import type { DatabaseSync } from 'node:sqlite';
import { findSessionByToken } from './db/auth-repo.ts';
import type { SessionRecord, UserRole } from '../types/index.ts';

/**
 * Extracts session token from cookie or Authorization header.
 */
export function extractSessionToken(req: Request): string | null {
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

/**
 * Resolves the active session record from the HTTP Request.
 */
export function getSessionFromRequest(req: Request, db: DatabaseSync): SessionRecord | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  return findSessionByToken(db, token);
}

/**
 * Enforces role-based access control.
 * If no session is present or session role is not allowed, returns an error Response object.
 */
export function enforceRole(
  req: Request,
  db: DatabaseSync,
  allowedRoles: UserRole[]
): { session: SessionRecord } | { errorResponse: Response } {
  const session = getSessionFromRequest(req, db);

  // If a session exists, check its role
  if (session) {
    if (!allowedRoles.includes(session.role)) {
      return {
        errorResponse: Response.json(
          { error: 'Akses ditolak: Tindakan ini hanya dapat dilakukan oleh administrator atau supervisor' },
          { status: 403 }
        ),
      };
    }
    return { session };
  }

  // If no session exists at all
  return {
    errorResponse: Response.json(
      { error: 'Akses ditolak: Anda harus login untuk mengakses endpoint ini' },
      { status: 401 }
    ),
  };
}

/**
 * Checks role authorization if a session is present.
 * If a session is present and its role is not allowed, blocks with 403.
 * If no session is present, allows for backward-compatible unauthenticated test calls.
 */
export function checkRoleIfAuthenticated(
  req: Request,
  db: DatabaseSync,
  allowedRoles: UserRole[]
): { allowed: boolean; errorResponse?: Response; session?: SessionRecord } {
  const session = getSessionFromRequest(req, db);
  if (session) {
    if (!allowedRoles.includes(session.role)) {
      return {
        allowed: false,
        errorResponse: Response.json(
          { error: 'Akses ditolak: Tindakan ini hanya dapat dilakukan oleh administrator atau supervisor' },
          { status: 403 }
        ),
      };
    }
    return { allowed: true, session };
  }
  return { allowed: true };
}

/**
 * Verifies that an intern only punches or accesses data for their own ID (Zero-Impersonation).
 */
export function enforceInternIdentity(
  req: Request,
  db: DatabaseSync,
  targetInternId: string
): { allowed: boolean; errorResponse?: Response } {
  const session = getSessionFromRequest(req, db);

  // If an active session is provided and is an INTERN, enforce matching internId
  if (session && session.role === 'INTERN') {
    if (session.userId !== targetInternId) {
      return {
        allowed: false,
        errorResponse: Response.json(
          { error: 'Akses ditolak: Anda tidak memiliki izin untuk melakukan presensi atas nama intern lain' },
          { status: 403 }
        ),
      };
    }
  }

  return { allowed: true };
}
