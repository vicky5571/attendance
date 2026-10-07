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
});
