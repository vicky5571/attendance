import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET as getConfig, PUT as putConfig } from '../src/app/api/config/route.ts';
import { GET as getInterns, POST as postInterns } from '../src/app/api/interns/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { setOfficeConfig } from '../src/lib/db/repo.ts';
import type { OfficeConfig, InternProfile } from '../src/types/index.ts';

describe('Config & Intern REST APIs', () => {
  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const testConfig: OfficeConfig = {
      targetLatitude: -6.180495,
      targetLongitude: 106.822769,
      maxRadiusMeters: 50,
      workStartTime: '08:30',
      workEndTime: '17:30',
      emailAtasan: 'supervisor@indosat.com',
    };
    setOfficeConfig(db, testConfig);
  });

  describe('GET & PUT /api/config', () => {
    it('should return current office config', async () => {
      const req = new Request('http://localhost:3000/api/config');
      const res = await getConfig(req);

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.targetLatitude, -6.180495);
      assert.equal(data.maxRadiusMeters, 50);
    });

    it('should update office config with valid payload', async () => {
      const updatePayload: OfficeConfig = {
        targetLatitude: -6.181,
        targetLongitude: 106.823,
        maxRadiusMeters: 75,
        workStartTime: '09:00',
        workEndTime: '18:00',
        emailAtasan: 'newboss@indosat.com',
      };

      const req = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const res = await putConfig(req);

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.maxRadiusMeters, 75);
      assert.equal(data.emailAtasan, 'newboss@indosat.com');
    });

    it('should reject invalid config payload', async () => {
      const req = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLatitude: 'invalid' }),
      });
      const res = await putConfig(req);

      assert.equal(res.status, 400);
    });
  });

  describe('GET & POST /api/interns', () => {
    it('should create and retrieve interns', async () => {
      const internPayload: InternProfile = {
        id: 'intern-zacky',
        namaLengkap: 'Zacky Kurniawan',
        divisi: 'Digital Experience',
        namaMentor: 'Vicky Lead',
        emailMentor: 'vicky@indosat.com',
        universitas: 'UI',
        jurusan: 'SI',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      };

      const postReq = new Request('http://localhost:3000/api/interns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(internPayload),
      });
      const postRes = await postInterns(postReq);
      assert.equal(postRes.status, 201);

      const getReq = new Request('http://localhost:3000/api/interns');
      const getRes = await getInterns(getReq);
      assert.equal(getRes.status, 200);

      const interns = await getRes.json();
      assert.equal(interns.length, 1);
      assert.equal(interns[0].id, 'intern-zacky');
    });

    it('should reject invalid intern payload', async () => {
      const postReq = new Request('http://localhost:3000/api/interns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaLengkap: 'Incomplete' }),
      });
      const postRes = await postInterns(postReq);
      assert.equal(postRes.status, 400);
    });
  });
});
