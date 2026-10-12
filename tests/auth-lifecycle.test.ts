import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateSessionToken } from '../src/lib/auth.ts';
import { createDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import {
  createUser,
  getUserByEmail,
  getUserById,
  createSession,
  findSessionByToken,
  deleteSession,
  cleanExpiredSessions,
} from '../src/lib/db/auth-repo.ts';

describe('Auth & Session Lifecycle Engine', () => {
  it('should hash and verify passwords using salted crypto', () => {
    const pass = 'AdminIOH2026!';
    const hash = hashPassword(pass);
    assert.ok(hash !== pass);
    assert.ok(verifyPassword(pass, hash));
    assert.ok(!verifyPassword('WrongPassword', hash));
    assert.ok(!verifyPassword('', hash));
  });

  it('should generate secure opaque session tokens', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    assert.equal(token1.length, 64);
    assert.notEqual(token1, token2);
  });

  it('should create, retrieve, and delete session records in SQLite', () => {
    const db = createDatabase(':memory:');
    initSchema(db);

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    createSession(db, {
      id: 'sess-1',
      userId: 'admin-1',
      role: 'ADMIN',
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const found = findSessionByToken(db, token);
    assert.ok(found);
    assert.equal(found.userId, 'admin-1');
    assert.equal(found.role, 'ADMIN');

    deleteSession(db, token);
    assert.equal(findSessionByToken(db, token), null);
  });

  it('should clean expired sessions automatically', () => {
    const db = createDatabase(':memory:');
    initSchema(db);

    const expiredToken = generateSessionToken();
    const activeToken = generateSessionToken();

    createSession(db, {
      id: 'sess-expired',
      userId: 'admin-1',
      role: 'ADMIN',
      token: expiredToken,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      createdAt: new Date().toISOString(),
    });

    createSession(db, {
      id: 'sess-active',
      userId: 'admin-1',
      role: 'ADMIN',
      token: activeToken,
      expiresAt: new Date(Date.now() + 100000).toISOString(), // Active
      createdAt: new Date().toISOString(),
    });

    const cleaned = cleanExpiredSessions(db);
    assert.equal(cleaned, 1);
    assert.equal(findSessionByToken(db, expiredToken), null);
    assert.ok(findSessionByToken(db, activeToken));
  });

  it('should create and retrieve users by email or ID', () => {
    const db = createDatabase(':memory:');
    initSchema(db);

    createUser(db, {
      id: 'user-supervisor-1',
      username: 'supervisor1',
      email: 'supervisor@indosat.com',
      passwordHash: hashPassword('Pass123!'),
      role: 'SUPERVISOR',
      name: 'Mentor Supervisor',
      createdAt: new Date().toISOString(),
    });

    const byEmail = getUserByEmail(db, 'supervisor@indosat.com');
    assert.ok(byEmail);
    assert.equal(byEmail.name, 'Mentor Supervisor');
    assert.equal(byEmail.role, 'SUPERVISOR');

    const byId = getUserById(db, 'user-supervisor-1');
    assert.ok(byId);
    assert.equal(byId.email, 'supervisor@indosat.com');
  });
});
