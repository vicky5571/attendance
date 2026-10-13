import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { seedDatabase } from '../src/lib/db/seed.ts';
import type { AppUser, SessionRecord, UserRole } from '../src/types/index.ts';

describe('Auth Schema & Seed Integrity', () => {
  it('should create users and sessions tables with proper schema constraints', () => {
    const db = createDatabase(':memory:');
    initSchema(db);

    const userTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get() as { name: string } | undefined;
    assert.ok(userTable, 'Table "users" must exist');

    const sessionTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get() as { name: string } | undefined;
    assert.ok(sessionTable, 'Table "sessions" must exist');

    // Test insert valid user
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('user-1', 'admin', 'admin@example.com', 'somehash', 'ADMIN', 'Admin User', new Date().toISOString());

    // Test insert valid session
    db.prepare(`
      INSERT INTO sessions (id, user_id, role, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('sess-1', 'user-1', 'ADMIN', 'tok-12345', new Date(Date.now() + 3600000).toISOString(), new Date().toISOString());

    const retrievedSession = db.prepare('SELECT * FROM sessions WHERE token = ?').get('tok-12345') as any;
    assert.ok(retrievedSession);
    assert.equal(retrievedSession.user_id, 'user-1');
    assert.equal(retrievedSession.role, 'ADMIN');
  });

  it('should enforce role constraint on users table', () => {
    const db = createDatabase(':memory:');
    initSchema(db);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('user-invalid', 'hacker', 'hacker@example.com', 'hash', 'INVALID_ROLE', 'Hacker', new Date().toISOString());
    }, /CHECK constraint failed/);
  });

  it('should seed default admin user idempotently', () => {
    const db = createDatabase(':memory:');
    initSchema(db);
    seedDatabase(db);

    const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@ioh.co.id'").get() as any;
    assert.ok(admin, 'Default admin user must be seeded');
    assert.equal(admin.role, 'ADMIN');
    assert.equal(admin.name, 'Administrator IOH');
    assert.ok(admin.password_hash);

    // Run seed again to ensure idempotency
    seedDatabase(db);
    const count = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE email = 'admin@ioh.co.id'").get() as { cnt: number };
    assert.equal(count.cnt, 1);
  });

  it('should support email and password_hash columns on interns table and retrieve via getInternByEmail', async () => {
    const { getInternByEmail } = await import('../src/lib/db/repo.ts');
    const db = createDatabase(':memory:');
    initSchema(db);

    db.prepare(`
      INSERT INTO interns (id, nama_lengkap, email, password_hash, divisi, nama_mentor, email_mentor, universitas, jurusan, periode_magang_selesai, status)
      VALUES ('intern-test', 'Test Intern', 'test@ioh.co.id', 'hash123', 'Div', 'Mentor', 'mentor@ioh.co.id', 'Univ', 'Maj', '2026-12-31', 'ACTIVE')
    `).run();

    const intern = getInternByEmail(db, 'test@ioh.co.id');
    assert.ok(intern, 'Intern should be retrieved by email');
    assert.equal(intern.id, 'intern-test');
    assert.equal(intern.email, 'test@ioh.co.id');
    assert.equal(intern.passwordHash, 'hash123');

    // Case-insensitive email lookup
    const internUpper = getInternByEmail(db, 'TEST@IOH.CO.ID');
    assert.ok(internUpper, 'Email lookup should be case-insensitive');
    assert.equal(internUpper.id, 'intern-test');
  });
});

