import { resolveGoogleMapsUrl, parseGoogleMapsUrl, reverseGeocodeNominatim } from '../../../../../lib/gmaps-parser.ts';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return Response.json(
        { error: 'Parameter url wajib diisi dengan link Google Maps yang valid.' },
        { status: 400 }
      );
    }

    const trimmed = url.trim();

    // Fast synchronous extraction first
    const directResult = parseGoogleMapsUrl(trimmed);
    if (directResult) {
      if (!directResult.address) {
        const geo = await reverseGeocodeNominatim(directResult.latitude, directResult.longitude);
        if (geo?.address) {
          directResult.address = geo.address;
        }
        if (!directResult.placeName && geo?.placeName) {
          directResult.placeName = geo.placeName;
        }
      }
      return Response.json(directResult, { status: 200 });
    }

    // Attempt network redirect resolution for short URLs (e.g. maps.app.goo.gl)
    const resolvedResult = await resolveGoogleMapsUrl(trimmed);
    if (resolvedResult) {
      return Response.json(resolvedResult, { status: 200 });
    }

    return Response.json(
      {
        error:
          'Koordinat tidak ditemukan dalam link tersebut. Pastikan link Google Maps memuat pin lokasi atau koordinat valid.',
      },
      { status: 422 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
