import type { DatabaseSync } from 'node:sqlite';
import type { AppUser, SessionRecord, UserRole } from '../../types/index.ts';

interface UserRow {
  id: string;
  username: string | null;
  email: string;
  password_hash: string;
  role: string;
  name: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

function mapUserRow(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username || undefined,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapSessionRow(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role as UserRole,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Creates a new user in the database.
 */
export function createUser(db: DatabaseSync, user: AppUser): void {
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    user.username ?? null,
    user.email.toLowerCase().trim(),
    user.passwordHash ?? '',
    user.role,
    user.name,
    user.createdAt
  );
}

/**
 * Finds a user by their email address.
 */
export function getUserByEmail(db: DatabaseSync, email: string): AppUser | null {
  const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email.toLowerCase().trim()) as UserRow | undefined;
  return row ? mapUserRow(row) : null;
}

/**
 * Finds a user by their user ID.
 */
export function getUserById(db: DatabaseSync, id: string): AppUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? mapUserRow(row) : null;
}

/**
 * Persists an active session record in the database.
 */
export function createSession(db: DatabaseSync, session: SessionRecord): void {
  db.prepare(`
    INSERT INTO sessions (id, user_id, role, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.userId,
    session.role,
    session.token,
    session.expiresAt,
    session.createdAt
  );
}

/**
 * Retrieves a valid (non-expired) session by token string.
 */
export function findSessionByToken(db: DatabaseSync, token: string, nowIso = new Date().toISOString()): SessionRecord | null {
  const row = db.prepare(`
    SELECT * FROM sessions 
    WHERE token = ? AND expires_at > ?
  `).get(token, nowIso) as SessionRow | undefined;

  return row ? mapSessionRow(row) : null;
}

/**
 * Deletes a session by its token.
 */
export function deleteSession(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Deletes all active sessions for a specific user ID.
 */
export function deleteUserSessions(db: DatabaseSync, userId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Cleans up all expired sessions from the database.
 * Returns the number of deleted records.
 */
export function cleanExpiredSessions(db: DatabaseSync, nowIso = new Date().toISOString()): number {
  const result = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso);
  return Number(result.changes);
}
