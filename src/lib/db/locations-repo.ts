import type { DatabaseSync } from 'node:sqlite';
import type { OfficeLocation } from '../../types/index.ts';

interface OfficeLocationRow {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  max_radius_meters: number;
  is_active: number;
}

function mapLocationRow(row: OfficeLocationRow): OfficeLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address || undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    maxRadiusMeters: row.max_radius_meters,
    isActive: row.is_active === 1,
  };
}

export function createOfficeLocation(db: DatabaseSync, loc: OfficeLocation): OfficeLocation {
  const stmt = db.prepare(`
    INSERT INTO office_locations (
      id, name, address, latitude, longitude, max_radius_meters, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    loc.id,
    loc.name,
    loc.address || null,
    loc.latitude,
    loc.longitude,
    loc.maxRadiusMeters,
    loc.isActive ? 1 : 0
  );
  return loc;
}

export function getOfficeLocationById(db: DatabaseSync, id: string): OfficeLocation | null {
  const stmt = db.prepare('SELECT * FROM office_locations WHERE id = ?');
  const row = stmt.get(id) as unknown as OfficeLocationRow | undefined;
  return row ? mapLocationRow(row) : null;
}

export function listOfficeLocations(db: DatabaseSync, onlyActive = false): OfficeLocation[] {
  let query = 'SELECT * FROM office_locations';
  if (onlyActive) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY name ASC';
  const stmt = db.prepare(query);
  const rows = stmt.all() as unknown as OfficeLocationRow[];
  return rows.map(mapLocationRow);
}
