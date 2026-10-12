import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { listOfficeLocations, createOfficeLocation } from '../../../../lib/db/locations-repo.ts';
import type { OfficeLocation } from '../../../../types/index.ts';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get('active') === 'true';

    const db = getDatabase();
    const locations = listOfficeLocations(db, onlyActive);

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

    const db = getDatabase();
    createOfficeLocation(db, newLocation);

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
