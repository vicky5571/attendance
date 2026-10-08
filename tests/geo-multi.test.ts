import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { findMatchingLocation } from '../src/lib/geo.ts';
import { GET as getLocations, POST as postLocation } from '../src/app/api/config/locations/route.ts';
import { POST as checkInRoute } from '../src/app/api/attendance/check-in/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { setOfficeConfig, createIntern } from '../src/lib/db/repo.ts';
import { createOfficeLocation } from '../src/lib/db/locations-repo.ts';
import type { OfficeLocation, InternProfile, OfficeConfig } from '../src/types/index.ts';

describe('Multi-Office Geofencing Hub Engine', () => {
  const kppti: OfficeLocation = {
    id: 'loc-kppti',
    name: 'KPPTI Jakarta Pusat',
    address: 'Medan Merdeka Barat',
    latitude: -6.180495,
    longitude: 106.822769,
    maxRadiusMeters: 50,
    isActive: true,
  };

  const bsd: OfficeLocation = {
    id: 'loc-bsd',
    name: 'Gedung Indosat BSD',
    address: 'BSD Green Office Park',
    latitude: -6.301540,
    longitude: 106.652170,
    maxRadiusMeters: 75,
    isActive: true,
  };

  const inactiveHub: OfficeLocation = {
    id: 'loc-inactive',
    name: 'Closed Branch',
    address: 'Old Site',
    latitude: -6.200000,
    longitude: 106.800000,
    maxRadiusMeters: 100,
    isActive: false,
  };

  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const config: OfficeConfig = {
      targetLatitude: -6.180495,
      targetLongitude: 106.822769,
      maxRadiusMeters: 50,
      workStartTime: '08:30',
      workEndTime: '17:30',
      emailAtasan: 'boss@indosat.com',
    };
    setOfficeConfig(db, config);

    const intern: InternProfile = {
      id: 'intern-multi',
      namaLengkap: 'Mobile Intern',
      divisi: 'Network Ops',
      namaMentor: 'Mentor BSD',
      emailMentor: 'bsd@indosat.com',
      universitas: 'ITB',
      jurusan: 'EE',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, intern);
    createOfficeLocation(db, kppti);
    createOfficeLocation(db, bsd);
    createOfficeLocation(db, inactiveHub);
  });

  describe('findMatchingLocation Helper (src/lib/geo.ts)', () => {
    it('should match KPPTI when within radius of KPPTI', () => {
      // 10 meters away from KPPTI
      const match = findMatchingLocation(
        { latitude: -6.180550, longitude: 106.822769 },
        [kppti, bsd, inactiveHub]
      );
      assert.ok(match);
      assert.equal(match.location.id, 'loc-kppti');
      assert.ok(match.distanceMeters <= 50);
    });

    it('should match BSD when within radius of BSD (even though ~25km away from KPPTI)', () => {
      // Exactly at BSD coordinates
      const match = findMatchingLocation(
        { latitude: -6.301540, longitude: 106.652170 },
        [kppti, bsd, inactiveHub]
      );
      assert.ok(match);
      assert.equal(match.location.id, 'loc-bsd');
      assert.equal(match.distanceMeters, 0);
    });

    it('should return null when coordinates are outside all hubs', () => {
      // Monas / far location
      const match = findMatchingLocation(
        { latitude: -6.175392, longitude: 106.827153 },
        [kppti, bsd, inactiveHub]
      );
      assert.equal(match, null);
    });

    it('should ignore inactive office locations', () => {
      const match = findMatchingLocation(
        { latitude: -6.200000, longitude: 106.800000 },
        [kppti, bsd, inactiveHub]
      );
      assert.equal(match, null);
    });
  });

  describe('REST API /api/config/locations', () => {
    it('GET should return list of active office locations', async () => {
      const req = new Request('http://localhost:3000/api/config/locations');
      const res = await getLocations(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.locations));
      assert.equal(data.locations.length, 3);
    });

    it('POST should create a new office hub', async () => {
      const newLoc = {
        name: 'Indosat Surabaya Hub',
        address: 'Jl. Kayoon Surabaya',
        latitude: -7.2654,
        longitude: 112.7512,
        maxRadiusMeters: 60,
      };

      const req = new Request('http://localhost:3000/api/config/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoc),
      });

      const res = await postLocation(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.location.id);
      assert.equal(data.location.name, 'Indosat Surabaya Hub');
    });
  });

  describe('Check-In at Multi-Hubs', () => {
    it('should successfully check-in at BSD Serpong and record locationId', async () => {
      const req = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-multi',
          latitude: -6.301540,
          longitude: 106.652170,
        }),
      });

      const res = await checkInRoute(req);
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.locationId, 'loc-bsd');
    });

    it('should reject check-in when coordinates are outside all hubs with 403', async () => {
      const req = new Request('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: 'intern-multi',
          latitude: -6.500000,
          longitude: 106.500000,
        }),
      });

      const res = await checkInRoute(req);
      assert.equal(res.status, 403);
    });
  });
});
