import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { createIntern, getIntern, updateInternLocation } from '../src/lib/db/repo.ts';
import { PATCH } from '../src/app/api/interns/route.ts';
import { saveSelectedOffice, getSelectedOffice } from '../src/lib/client-storage.ts';

describe('Intern Office / Hub Assignment and Change Layer', () => {
  const db = getDatabase();

  beforeEach(() => {
    initSchema(db);
  });

  it('should update and retrieve intern assigned office location in database', () => {
    const internId = `intern-test-${Date.now()}`;
    createIntern(db, {
      id: internId,
      namaLengkap: 'Budi Santoso',
      divisi: 'Network Operations',
      namaMentor: 'Ahmad Mentor',
      emailMentor: 'ahmad@ioh.co.id',
      universitas: 'ITB',
      jurusan: 'Teknik Elektro',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    });

    // Update office location
    updateInternLocation(db, internId, 'loc-surabaya');
    const updated = getIntern(db, internId);
    assert.ok(updated);
    assert.equal(updated.assignedLocationId, 'loc-surabaya');
  });

  it('should update intern office via PATCH /api/interns', async () => {
    const internId = `intern-patch-${Date.now()}`;
    createIntern(db, {
      id: internId,
      namaLengkap: 'Dewi Lestari',
      divisi: 'IT Core',
      namaMentor: 'Siti Mentor',
      emailMentor: 'siti@ioh.co.id',
      universitas: 'UGM',
      jurusan: 'Ilmu Komputer',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    });

    const req = new Request('http://localhost:3000/api/interns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internId,
        locationId: 'loc-bandung',
      }),
    });

    const res = await PATCH(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.locationId, 'loc-bandung');

    const intern = getIntern(db, internId);
    assert.equal(intern?.assignedLocationId, 'loc-bandung');
  });

  it('should reject PATCH /api/interns with 400 when parameters are missing', async () => {
    const req = new Request('http://localhost:3000/api/interns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internId: '' }),
    });

    const res = await PATCH(req);
    assert.equal(res.status, 400);
  });

  it('should persist and retrieve user selected office in client storage', () => {
    saveSelectedOffice('intern-123', 'loc-medan');
    const retrieved = getSelectedOffice('intern-123');
    assert.equal(retrieved, 'loc-medan');
  });
});
