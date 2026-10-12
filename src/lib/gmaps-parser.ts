export interface ParsedGmapsLocation {
  latitude: number;
  longitude: number;
  placeName?: string;
  address?: string;
  resolvedUrl?: string;
}

/**
 * Synchronously parses Google Maps URLs, query links, or raw coordinate strings.
 * Supports:
 * - Desktop URLs with @lat,lng: https://www.google.com/maps/@-6.180495,106.822769,17z
 * - Place pins with !3d and !4d: https://www.google.com/maps/place/.../!3d-6.180495!4d106.822769
 * - Search query URLs: https://maps.google.com/?q=-6.180495,106.822769
 * - Static map center links: https://maps.google.com/maps/api/staticmap?center=-6.180495%2C106.822769
 * - Raw coordinates: "-6.180495, 106.822769"
 */
export function parseGoogleMapsUrl(input: string): ParsedGmapsLocation | null {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  let lat: number | null = null;
  let lng: number | null = null;

  // 1. Check for place coordinates !3d<lat>!4d<lng> or !3d<lat>... !4d<lng>
  const placeCoordMatch = str.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
  if (placeCoordMatch) {
    lat = parseFloat(placeCoordMatch[1]);
    lng = parseFloat(placeCoordMatch[2]);
  }

  // 2. Check for @<lat>,<lng> pattern
  if (lat === null) {
    const atMatch = str.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }
  }

  // 3. Check for query parameter (?q=lat,lng, ?query=lat,lng, ?ll=lat,lng, ?center=lat,lng)
  if (lat === null) {
    const queryMatch = str.match(
      /[?&](?:q|query|ll|sll|center)=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i
    );
    if (queryMatch) {
      lat = parseFloat(queryMatch[1]);
      lng = parseFloat(queryMatch[2]);
    }
  }

  // 4. Check for raw comma-separated coordinates: "-6.180495, 106.822769"
  if (lat === null) {
    const rawMatch = str.match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)$/);
    if (rawMatch) {
      lat = parseFloat(rawMatch[1]);
      lng = parseFloat(rawMatch[2]);
    }
  }

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Geographic boundaries validation
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  // Extract place name and address from /place/Name+Here,+Street+Address/ if present
  let placeName: string | undefined;
  let address: string | undefined;
  const placeNameMatch = str.match(/\/place\/([^/@?#]+)/);
  if (placeNameMatch) {
    try {
      const decoded = decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' ')).trim();
      if (decoded.includes(',')) {
        const parts = decoded.split(',');
        placeName = parts[0].trim();
        address = parts.slice(1).join(',').trim();
      } else {
        placeName = decoded;
      }
    } catch {
      // ignore decode error
    }
  }

  return {
    latitude: lat,
    longitude: lng,
    placeName: placeName || undefined,
    address: address || undefined,
  };
}

/**
 * Reverse-geocodes coordinates into a full address via OpenStreetMap Nominatim.
 */
export async function reverseGeocodeNominatim(
  lat: number,
  lng: number
): Promise<{ address?: string; placeName?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Indosat-IAC-Attendance/1.0 (contact: admin@ioh.co.id)',
        'Accept-Language': 'id,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const address = data.display_name;
    const placeName = data.name || data.address?.building || data.address?.office;
    return { address, placeName };
  } catch {
    return null;
  }
}

/**
 * Resolves short Google Maps URLs (e.g. maps.app.goo.gl or goo.gl/maps) via HTTP redirect follow
 * and extracts geographic coordinates and address from the resolved URL or reverse geocoding.
 */
export async function resolveGoogleMapsUrl(inputUrl: string): Promise<ParsedGmapsLocation | null> {
  let parsed = parseGoogleMapsUrl(inputUrl);

  if (!parsed) {
    const trimmed = inputUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(trimmed, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Try parsing the redirected URL
      if (res.url && res.url !== trimmed) {
        parsed = parseGoogleMapsUrl(res.url);
        if (parsed) {
          parsed.resolvedUrl = res.url;
        }
      }

      // Try parsing the HTML text body (meta refresh or static map images)
      if (!parsed) {
        const htmlText = await res.text();
        parsed = parseGoogleMapsUrl(htmlText);
        if (parsed) {
          parsed.resolvedUrl = res.url;
        }
      }
    } catch {
      return null;
    }
  }

  if (!parsed) return null;

  // Enrich with reverse geocoding if address is missing
  if (!parsed.address) {
    const geo = await reverseGeocodeNominatim(parsed.latitude, parsed.longitude);
    if (geo?.address) {
      parsed.address = geo.address;
    }
    if (!parsed.placeName && geo?.placeName) {
      parsed.placeName = geo.placeName;
    }
  }

  return parsed;
}
