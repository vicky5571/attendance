import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import {
  getOfficeConfig,
  setOfficeConfig,
  createIntern,
  getIntern,
  listInterns,
  recordCheckIn,
  recordCheckOut,
  getAttendanceRecord,
  listAttendanceByDate,
} from '../src/lib/db/repo.ts';
import type { OfficeConfig, InternProfile, AttendanceRecord } from '../src/types/index.ts';

describe('Database Engine & Repository Layer', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initSchema(db);
  });

  describe('OfficeConfig Singleton', () => {
    it('should return null when office config is not yet initialized', () => {
      const config = getOfficeConfig(db);
      assert.equal(config, null);
    });

    it('should insert and retrieve office config properly', () => {
      const testConfig: OfficeConfig = {
        targetLatitude: -6.180495,
        targetLongitude: 106.822769,
        maxRadiusMeters: 50,
        workStartTime: '08:30',
        workEndTime: '17:30',
        emailAtasan: 'supervisor@indosat.com',
        waGroupInternsJid: '1203630111@g.us',
        waGroupMentorsJid: '1203630222@g.us',
      };

      setOfficeConfig(db, testConfig);
      const retrieved = getOfficeConfig(db);

      assert.deepEqual(retrieved, testConfig);
    });

    it('should update existing office config without duplicating rows', () => {
      const initial: OfficeConfig = {
        targetLatitude: -6.180495,
        targetLongitude: 106.822769,
        maxRadiusMeters: 50,
        workStartTime: '08:30',
        workEndTime: '17:30',
        emailAtasan: 'supervisor@indosat.com',
      };
      setOfficeConfig(db, initial);

      const updated: OfficeConfig = {
        ...initial,
        maxRadiusMeters: 100,
        workStartTime: '09:00',
      };
      setOfficeConfig(db, updated);

      const retrieved = getOfficeConfig(db);
      assert.deepEqual(retrieved, updated);
    });
  });

  describe('InternProfile Repository', () => {
    it('should create and retrieve an intern profile', () => {
      const intern: InternProfile = {
        id: 'intern-1',
        namaLengkap: 'Zacky Developer',
        divisi: 'Digital Experience',
        namaMentor: 'Vicky Engineer',
        emailMentor: 'vicky@indosat.com',
        universitas: 'Universitas Indonesia',
        jurusan: 'Ilmu Komputer',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      };

      createIntern(db, intern);
      const found = getIntern(db, 'intern-1');

      assert.deepEqual(found, intern);
    });

    it('should list all active interns', () => {
      const intern1: InternProfile = {
        id: 'intern-1',
        namaLengkap: 'Zacky Developer',
        divisi: 'Digital Experience',
        namaMentor: 'Vicky Engineer',
        emailMentor: 'vicky@indosat.com',
        universitas: 'UI',
        jurusan: 'CS',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      };
      const intern2: InternProfile = {
        id: 'intern-2',
        namaLengkap: 'John Doe',
        divisi: 'Network Operations',
        namaMentor: 'Jane Smith',
        emailMentor: 'jane@indosat.com',
        universitas: 'ITB',
        jurusan: 'EE',
        periodeMagangSelesai: '2026-06-30',
        status: 'COMPLETED',
      };

      createIntern(db, intern1);
      createIntern(db, intern2);

      const activeInterns = listInterns(db, 'ACTIVE');
      assert.equal(activeInterns.length, 1);
      assert.equal(activeInterns[0].id, 'intern-1');

      const allInterns = listInterns(db);
      assert.equal(allInterns.length, 2);
    });
  });

  describe('AttendanceRecord Repository', () => {
    beforeEach(() => {
      createIntern(db, {
        id: 'intern-1',
        namaLengkap: 'Zacky Developer',
        divisi: 'Digital Experience',
        namaMentor: 'Vicky Engineer',
        emailMentor: 'vicky@indosat.com',
        universitas: 'UI',
        jurusan: 'CS',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      });
    });

    it('should record check-in and retrieve record', () => {
      const record: AttendanceRecord = {
        id: 'att-1',
        internId: 'intern-1',
        date: '2026-10-08',
        checkInTime: '08:25:00',
        checkInCoords: { latitude: -6.180495, longitude: 106.822769 },
        distanceInMeters: 4.2,
        status: 'ON_TIME',
        remarks: 'Tepat Waktu',
      };

      recordCheckIn(db, record);
      const retrieved = getAttendanceRecord(db, 'intern-1', '2026-10-08');

      assert.deepEqual(retrieved, record);
    });

    it('should reject duplicate check-in on the same date for the same intern', () => {
      const record1: AttendanceRecord = {
        id: 'att-1',
        internId: 'intern-1',
        date: '2026-10-08',
        checkInTime: '08:25:00',
        status: 'ON_TIME',
        remarks: 'Tepat Waktu',
      };
      const record2: AttendanceRecord = {
        id: 'att-2',
        internId: 'intern-1',
        date: '2026-10-08',
        checkInTime: '08:40:00',
        status: 'LATE',
        remarks: 'Terlambat 10 menit',
      };

      recordCheckIn(db, record1);

      assert.throws(
        () => recordCheckIn(db, record2),
        /UNIQUE constraint failed|duplicate/i
      );
    });

    it('should update record on check-out', () => {
      const initial: AttendanceRecord = {
        id: 'att-1',
        internId: 'intern-1',
        date: '2026-10-08',
        checkInTime: '08:25:00',
        checkInCoords: { latitude: -6.180495, longitude: 106.822769 },
        distanceInMeters: 4.2,
        status: 'ON_TIME',
        remarks: 'Tepat Waktu',
      };
      recordCheckIn(db, initial);

      const updated = recordCheckOut(db, 'intern-1', '2026-10-08', {
        checkOutTime: '17:35:00',
        checkOutCoords: { latitude: -6.180495, longitude: 106.822769 },
        remarks: 'Tepat Waktu | Check-Out Sesuai Jadwal',
      });

      assert.equal(updated.checkOutTime, '17:35:00');
      assert.deepEqual(updated.checkOutCoords, { latitude: -6.180495, longitude: 106.822769 });
      assert.equal(updated.remarks, 'Tepat Waktu | Check-Out Sesuai Jadwal');

      const retrieved = getAttendanceRecord(db, 'intern-1', '2026-10-08');
      assert.deepEqual(retrieved, updated);
    });

    it('should list all attendance records for a specific date', () => {
      createIntern(db, {
        id: 'intern-2',
        namaLengkap: 'Alice Smith',
        divisi: 'Network',
        namaMentor: 'Bob',
        emailMentor: 'bob@indosat.com',
        universitas: 'ITB',
        jurusan: 'EE',
        periodeMagangSelesai: '2026-12-31',
        status: 'ACTIVE',
      });

      recordCheckIn(db, {
        id: 'att-1',
        internId: 'intern-1',
        date: '2026-10-08',
        checkInTime: '08:15:00',
        status: 'ON_TIME',
      });
      recordCheckIn(db, {
        id: 'att-2',
        internId: 'intern-2',
        date: '2026-10-08',
        checkInTime: '08:45:00',
        status: 'LATE',
      });

      const todayList = listAttendanceByDate(db, '2026-10-08');
      assert.equal(todayList.length, 2);

      const yesterdayList = listAttendanceByDate(db, '2026-10-07');
      assert.equal(yesterdayList.length, 0);
    });
  });
});
