import { getDatabase } from '../../../lib/db/client.ts';
import { getOfficeConfig, setOfficeConfig } from '../../../lib/db/repo.ts';
import { checkRoleIfAuthenticated } from '../../../lib/auth-guard.ts';
import type { OfficeConfig } from '../../../types/index.ts';

export async function GET() {
  const db = getDatabase();
  const config = getOfficeConfig(db);
  if (!config) {
    return Response.json({ error: 'Office config not found' }, { status: 404 });
  }
  return Response.json(config);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as OfficeConfig;

    if (
      typeof body.targetLatitude !== 'number' ||
      typeof body.targetLongitude !== 'number' ||
      typeof body.maxRadiusMeters !== 'number' ||
      !body.workStartTime ||
      !body.workEndTime ||
      !body.emailAtasan
    ) {
      return Response.json(
        { error: 'Invalid or missing required office configuration fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Enforce administrative role if authenticated
    const roleCheck = checkRoleIfAuthenticated(request, db, ['ADMIN', 'SUPERVISOR']);
    if (!roleCheck.allowed && roleCheck.errorResponse) {
      return roleCheck.errorResponse;
    }

    setOfficeConfig(db, body);
    const updated = getOfficeConfig(db);

    return Response.json(updated);
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}
