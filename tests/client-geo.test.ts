import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistance, isWithinRadius, formatDistanceFeedback } from '../src/lib/client-geo.ts';

describe('Client Geolocation Helpers', () => {
  const officeLat = -6.200000;
  const officeLng = 106.816666;

  it('should return 0 meters for identical client coordinates', () => {
    const dist = calculateDistance(officeLat, officeLng, officeLat, officeLng);
    assert.equal(dist, 0);
  });

  it('should calculate distance accurately for nearby coordinate (~20m)', () => {
    const nearbyLat = -6.200180;
    const nearbyLng = 106.816666;
    const dist = calculateDistance(nearbyLat, nearbyLng, officeLat, officeLng);
    assert.ok(dist >= 18 && dist <= 22, `Expected ~20m, got ${dist}`);
    assert.equal(isWithinRadius(dist, 50), true);
  });

  it('should format compliant feedback message when within radius', () => {
    const feedback = formatDistanceFeedback(12, 50);
    assert.equal(feedback.isWithin, true);
    assert.equal(feedback.message, 'Anda berjarak 12m dari kantor - Memenuhi syarat');
  });

  it('should format compliant feedback message when outside radius', () => {
    const feedback = formatDistanceFeedback(75, 50);
    assert.equal(feedback.isWithin, false);
    assert.equal(feedback.message, 'Anda berjarak 75m dari kantor - Di luar batas radius (50m)');
  });

  it('should handle null distance gracefully', () => {
    const feedback = formatDistanceFeedback(null, 50);
    assert.equal(feedback.isWithin, false);
    assert.equal(feedback.message, 'Menunggu koordinat GPS...');
  });
});
