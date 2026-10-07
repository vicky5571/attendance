import { getDatabase } from '../../../../lib/db/client.ts';
import {
  getOfficeConfig,
  getAttendanceRecord,
  recordCheckOut,
} from '../../../../lib/db/repo.ts';
import { evaluateAttendanceRemarks } from '../../../../lib/geo.ts';

interface CheckOutPayload {
  internId: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckOutPayload;

    if (!body.internId) {
      return Response.json(
        { error: 'Missing required field: internId' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 1. Resolve date and time
    const dateObj = body.timestamp ? new Date(body.timestamp) : new Date();
    const dateStr = body.timestamp
      ? body.timestamp.split('T')[0]
      : dateObj.toISOString().split('T')[0];

    const timeStr = body.timestamp && body.timestamp.includes('T')
      ? body.timestamp.split('T')[1].slice(0, 8)
      : dateObj.toTimeString().slice(0, 8);

    // 2. Retrieve existing check-in
    const existing = getAttendanceRecord(db, body.internId, dateStr);
    if (!existing || !existing.checkInTime) {
      return Response.json(
        { error: `No check-in record found for intern ${body.internId} on ${dateStr}` },
        { status: 404 }
      );
    }

    if (existing.checkOutTime) {
      return Response.json(
        { error: `Check-out already recorded for intern ${body.internId} on ${dateStr}` },
        { status: 409 }
      );
    }

    // 3. Retrieve config for schedule evaluation
    const config = getOfficeConfig(db);
    const workEndTime = config?.workEndTime || '17:30';

    const timeHHmm = timeStr.slice(0, 5);
    const outEval = evaluateAttendanceRemarks(timeHHmm, workEndTime, 'CHECK_OUT');

    const combinedRemarks = existing.remarks
      ? `${existing.remarks} | ${outEval.remarks}`
      : outEval.remarks;

    const coords =
      typeof body.latitude === 'number' && typeof body.longitude === 'number'
        ? { latitude: body.latitude, longitude: body.longitude }
        : undefined;

    const updated = recordCheckOut(db, body.internId, dateStr, {
      checkOutTime: timeStr,
      checkOutCoords: coords,
      remarks: combinedRemarks,
    });

    return Response.json(updated, { status: 200 });
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}
