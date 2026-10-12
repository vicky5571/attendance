import type { Coordinates, OfficeLocation } from '../types/index.ts';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates Great-Circle distance between two points using the Haversine formula.
 * @returns Distance in meters.
 */
export function calculateDistanceInMeters(point1: Coordinates, point2: Coordinates): number {
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Verifies if coordinates are within the permitted geofence radius.
 */
export function isWithinGeofence(
  current: Coordinates,
  target: Coordinates,
  maxRadiusMeters: number
): boolean {
  const distance = calculateDistanceInMeters(current, target);
  return distance <= maxRadiusMeters;
}

/**
 * Matches coordinates against all active office locations.
 * Returns the matched location and distance, or null if outside all locations.
 */
export function findMatchingLocation(
  coords: Coordinates,
  locations: OfficeLocation[]
): { location: OfficeLocation; distanceMeters: number } | null {
  for (const loc of locations) {
    if (!loc.isActive) continue;
    const distance = calculateDistanceInMeters(coords, {
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    if (distance <= loc.maxRadiusMeters) {
      return { location: loc, distanceMeters: distance };
    }
  }
  return null;
}

/**
 * Evaluates punctuality and departure remarks based on work schedule.
 */
export function evaluateAttendanceRemarks(
  timeStr: string, // "HH:mm"
  targetTimeStr: string, // "HH:mm"
  type: 'CHECK_IN' | 'CHECK_OUT'
): { isViolated: boolean; remarks: string } {
  const [h, m] = timeStr.split(':').map(Number);
  const [targetH, targetM] = targetTimeStr.split(':').map(Number);

  const currentMinutes = h * 60 + m;
  const targetMinutes = targetH * 60 + targetM;

  if (type === 'CHECK_IN') {
    if (currentMinutes > targetMinutes) {
      const diff = currentMinutes - targetMinutes;
      return { isViolated: true, remarks: `Terlambat ${diff} menit` };
    }
    return { isViolated: false, remarks: 'Tepat Waktu' };
  } else {
    if (currentMinutes < targetMinutes) {
      const diff = targetMinutes - currentMinutes;
      return { isViolated: true, remarks: `Pulang sebelum waktu kerja: lebih awal ${diff} menit` };
    }
    return { isViolated: false, remarks: 'Tepat Waktu' };
  }
}
