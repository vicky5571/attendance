import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleMapsUrl } from '../src/lib/gmaps-parser.ts';
import { POST } from '../src/app/api/config/locations/parse-gmaps/route.ts';

describe('Google Maps Coordinate Extractor', () => {
  it('should extract coordinates from standard @lat,lng Google Maps URL', () => {
    const url = 'https://www.google.com/maps/@-6.180495,106.822769,17z';
    const result = parseGoogleMapsUrl(url);
    assert.ok(result);
    assert.equal(result.latitude, -6.180495);
    assert.equal(result.longitude, 106.822769);
  });

  it('should extract coordinates and place name from Google Maps place link', () => {
    const url =
      'https://www.google.com/maps/place/Gedung+KPPTI+Indosat/@-6.180495,106.822769,17z/data=!4m6!3m5!1s0x2e69f4!8m2!3d-6.180495!4d106.822769';
    const result = parseGoogleMapsUrl(url);
    assert.ok(result);
    assert.equal(result.latitude, -6.180495);
    assert.equal(result.longitude, 106.822769);
    assert.equal(result.placeName, 'Gedung KPPTI Indosat');
  });

  it('should extract coordinates from ?q= parameter URL', () => {
    const url = 'https://maps.google.com/?q=-6.180495,106.822769';
    const result = parseGoogleMapsUrl(url);
    assert.ok(result);
    assert.equal(result.latitude, -6.180495);
    assert.equal(result.longitude, 106.822769);
  });

  it('should extract coordinates from search API query URL', () => {
    const url = 'https://www.google.com/maps/search/?api=1&query=-6.180495,106.822769';
    const result = parseGoogleMapsUrl(url);
    assert.ok(result);
    assert.equal(result.latitude, -6.180495);
    assert.equal(result.longitude, 106.822769);
  });

  it('should extract coordinates from raw comma-separated string', () => {
    const raw = '-6.180495, 106.822769';
    const result = parseGoogleMapsUrl(raw);
    assert.ok(result);
    assert.equal(result.latitude, -6.180495);
    assert.equal(result.longitude, 106.822769);
  });

  it('should return null for invalid or non-location strings', () => {
    assert.equal(parseGoogleMapsUrl(''), null);
    assert.equal(parseGoogleMapsUrl('https://google.com'), null);
    assert.equal(parseGoogleMapsUrl('Random text without coordinates'), null);
  });

  it('should reject coordinates outside valid geographic range', () => {
    assert.equal(parseGoogleMapsUrl('95.12345, 106.12345'), null);
    assert.equal(parseGoogleMapsUrl('-6.12345, 200.12345'), null);
  });
});

describe('REST API /api/config/locations/parse-gmaps', () => {
  it('should parse valid gmaps URL via POST request', async () => {
    const req = new Request('http://localhost:3000/api/config/locations/parse-gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.google.com/maps/place/Indosat+Surabaya/@-7.2654,112.7512,17z/data=!4m6!3m5!1s0x0!8m2!3d-7.2654!4d112.7512',
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.latitude, -7.2654);
    assert.equal(data.longitude, 112.7512);
    assert.equal(data.placeName, 'Indosat Surabaya');
  });

  it('should return 400 when url is missing or empty', async () => {
    const req = new Request('http://localhost:3000/api/config/locations/parse-gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '' }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  it('should return 422 when URL cannot be parsed into coordinates', async () => {
    const req = new Request('http://localhost:3000/api/config/locations/parse-gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/not-maps' }),
    });

    const res = await POST(req);
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.ok(data.error);
  });
});
