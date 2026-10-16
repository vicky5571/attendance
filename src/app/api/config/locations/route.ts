import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import {
  listOfficeLocations,
  createOfficeLocation,
  deleteOfficeLocation,
} from '../../../../lib/db/locations-repo.ts';
import { isSupabaseConfigured } from '../../../../lib/supabase/admin.ts';
import {
  listOfficeLocationsFromSupabase,
  createOfficeLocationInSupabase,
  deleteOfficeLocationInSupabase,
} from '../../../../lib/db/supabase-repo.ts';
import type { OfficeLocation } from '../../../../types/index.ts';

export const DEFAULT_OFFICE_LOCATIONS: OfficeLocation[] = [
  {
    id: 'loc-kppti',
    name: 'KPPTI Jakarta Pusat (HQ)',
    address: 'Jl. Medan Merdeka Barat No. 21, Gambir, Jakarta Pusat',
    latitude: -6.180495,
    longitude: 106.822769,
    maxRadiusMeters: 50,
    isActive: true,
  },
  {
    id: 'loc-bsd',
    name: 'Gedung Indosat Serpong BSD',
    address: 'BSD Green Office Park, Tangerang Selatan',
    latitude: -6.30154,
    longitude: 106.65217,
    maxRadiusMeters: 75,
    isActive: true,
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get('active') === 'true';

    let locations: OfficeLocation[] = [];
    if (isSupabaseConfigured()) {
      locations = await listOfficeLocationsFromSupabase(onlyActive);
    }

    if (locations.length === 0) {
      const db = getDatabase();
      locations = listOfficeLocations(db, onlyActive);
    }

    if (locations.length === 0) {
      locations = DEFAULT_OFFICE_LOCATIONS;
    }

    return Response.json({ locations }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, latitude, longitude, maxRadiusMeters } = body;

    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return Response.json(
        { error: 'Field name, latitude, dan longitude wajib diisi dengan benar' },
        { status: 400 }
      );
    }

    const newLocation: OfficeLocation = {
      id: `loc-${randomUUID().slice(0, 8)}`,
      name,
      address: address || undefined,
      latitude,
      longitude,
      maxRadiusMeters: maxRadiusMeters || 50,
      isActive: true,
    };

    if (isSupabaseConfigured()) {
      await createOfficeLocationInSupabase(newLocation);
    }

    const db = getDatabase();
    try {
      createOfficeLocation(db, newLocation);
    } catch {}

    return Response.json(
      { message: 'Office location berhasil ditambahkan', location: newLocation },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { error: 'Parameter id wajib disertakan' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      await deleteOfficeLocationInSupabase(id);
    }

    const db = getDatabase();
    try {
      deleteOfficeLocation(db, id);
    } catch {}

    return Response.json(
      { message: 'Lokasi kantor berhasil dihapus' },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
