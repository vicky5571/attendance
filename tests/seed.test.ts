import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { seedDatabase } from '../src/lib/db/seed.ts';
import { getOfficeConfig, listInterns } from '../src/lib/db/repo.ts';

describe('Database Seeder', () => {
  it('should seed default office config and initial interns idempotently', () => {
    const db = createDatabase(':memory:');
    initSchema(db);

    // Initial seed
    seedDatabase(db);

    const config = getOfficeConfig(db);
    assert.ok(config);
    assert.equal(config.targetLatitude, -6.180495);
    assert.equal(config.targetLongitude, 106.822769);
    assert.equal(config.maxRadiusMeters, 50);
    assert.equal(config.workStartTime, '08:30');
    assert.equal(config.workEndTime, '17:30');

    const interns = listInterns(db);
    assert.ok(interns.length >= 2);
    const zacky = interns.find((i) => i.namaLengkap.includes('Zacky'));
    assert.ok(zacky);
    assert.equal(zacky.status, 'ACTIVE');

    // Run seeder again to ensure idempotency
    assert.doesNotThrow(() => {
      seedDatabase(db);
    });

    const internsAfter = listInterns(db);
    assert.equal(internsAfter.length, interns.length);
  });

  it('should seed default interns with valid corporate email and password hashes', async () => {
    const { getIntern } = await import('../src/lib/db/repo.ts');
    const { verifyPassword } = await import('../src/lib/auth.ts');
    const db = createDatabase(':memory:');
    initSchema(db);
    seedDatabase(db);

    const sarah = getIntern(db, 'intern-sarah');
    assert.ok(sarah, 'Sarah must be seeded');
    assert.equal(sarah.email, 'sarah@ioh.co.id');
    assert.ok(sarah.passwordHash, 'Sarah must have passwordHash');
    assert.ok(verifyPassword('InternIOH2026!', sarah.passwordHash), 'Password hash must verify with InternIOH2026!');

    const zacky = getIntern(db, 'intern-zacky');
    assert.ok(zacky, 'Zacky must be seeded');
    assert.equal(zacky.email, 'zacky@ioh.co.id');
    assert.ok(zacky.passwordHash, 'Zacky must have passwordHash');
    assert.ok(verifyPassword('InternIOH2026!', zacky.passwordHash), 'Password hash must verify with InternIOH2026!');
  });

  it('should seed default relocation request reloc-init-01 for intern-zacky idempotently', () => {
    const db = createDatabase(':memory:');
    initSchema(db);
    seedDatabase(db);

    const reloc = db.prepare('SELECT * FROM relocation_requests WHERE id = ?').get('reloc-init-01') as any;
    assert.ok(reloc, 'reloc-init-01 must be seeded');
    assert.equal(reloc.intern_id, 'intern-zacky');
    assert.equal(reloc.current_location_id, 'loc-kppti');
    assert.equal(reloc.target_location_id, 'loc-bsd');
    assert.equal(reloc.status, 'PENDING');

    // Run seed again to verify idempotency
    assert.doesNotThrow(() => {
      seedDatabase(db);
    });
    const relocAfter = db.prepare('SELECT * FROM relocation_requests WHERE id = ?').get('reloc-init-01') as any;
    assert.ok(relocAfter);
    assert.equal(relocAfter.status, 'PENDING');
  });
});
