import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceInMeters, isWithinGeofence, evaluateAttendanceRemarks } from '../src/lib/geo.ts';

describe('Geo & Geofencing Calculations', () => {
  const office = { latitude: -6.200000, longitude: 106.816666 }; // Example Jakarta coordinate

  it('should return 0 meters for identical coordinates', () => {
    const dist = calculateDistanceInMeters(office, office);
    assert.equal(dist, 0);
  });

  it('should correctly determine when within 50m geofence', () => {
    // Coordinate ~20 meters away
    const nearby = { latitude: -6.200180, longitude: 106.816666 };
    const dist = calculateDistanceInMeters(office, nearby);
    assert.ok(dist <= 50, `Distance ${dist} should be within 50m`);
    assert.equal(isWithinGeofence(nearby, office, 50), true);
  });

  it('should reject coordinates outside 50m geofence', () => {
    // Coordinate ~200 meters away
    const farAway = { latitude: -6.202000, longitude: 106.816666 };
    assert.equal(isWithinGeofence(farAway, office, 50), false);
  });
});

describe('Attendance Remarks Evaluator', () => {
  it('should mark check-in as Tepat Waktu if on or before work start time', () => {
    const res = evaluateAttendanceRemarks('08:15', '08:30', 'CHECK_IN');
    assert.equal(res.isViolated, false);
    assert.equal(res.remarks, 'Tepat Waktu');
  });

  it('should mark check-in as Terlambat with exact minutes if late', () => {
    const res = evaluateAttendanceRemarks('08:45', '08:30', 'CHECK_IN');
    assert.equal(res.isViolated, true);
    assert.equal(res.remarks, 'Terlambat 15 menit');
  });

  it('should flag early departure if check-out is before work end time', () => {
    const res = evaluateAttendanceRemarks('16:45', '17:30', 'CHECK_OUT');
    assert.equal(res.isViolated, true);
    assert.equal(res.remarks, 'Pulang sebelum waktu kerja: lebih awal 45 menit');
  });

  it('should mark check-out as Tepat Waktu if on or after work end time', () => {
    const res = evaluateAttendanceRemarks('17:30', '17:30', 'CHECK_OUT');
    assert.equal(res.isViolated, false);
    assert.equal(res.remarks, 'Tepat Waktu');
  });
});
