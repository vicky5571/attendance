/**
 * Client Geolocation Helper
 * Provides high-accuracy Haversine distance calculation and user feedback formatting.
 */

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates Great-Circle distance in meters between two lat/lng coordinates.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const p1 = toRadians(lat1);
  const p2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(p1) * Math.cos(p2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Checks if distance is within max allowed radius.
 */
export function isWithinRadius(distance: number | null, maxRadius: number): boolean {
  if (distance === null) return false;
  return distance <= maxRadius;
}

/**
 * Formats user-facing indicator feedback according to product specification:
 * "Anda berjarak {distance}m dari kantor - Memenuhi syarat"
 */
export function formatDistanceFeedback(
  distance: number | null,
  maxRadius: number
): { isWithin: boolean; message: string } {
  if (distance === null) {
    return {
      isWithin: false,
      message: 'Menunggu koordinat GPS...',
    };
  }

  const isWithin = distance <= maxRadius;
  if (isWithin) {
    return {
      isWithin: true,
      message: `Anda berjarak ${distance}m dari kantor - Memenuhi syarat`,
    };
  }

  return {
    isWithin: false,
    message: `Anda berjarak ${distance}m dari kantor - Di luar batas radius (${maxRadius}m)`,
  };
}
