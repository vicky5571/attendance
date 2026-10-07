import { getDatabase } from '../../../../lib/db/client.ts';
import {
  getOfficeConfig,
  getIntern,
  getAttendanceRecord,
  recordCheckIn,
} from '../../../../lib/db/repo.ts';
import {
  calculateDistanceInMeters,
  evaluateAttendanceRemarks,
} from '../../../../lib/geo.ts';
import type { AttendanceRecord } from '../../../../types/index.ts';

interface CheckInPayload {
  internId: string;
  latitude: number;
  longitude: number;
  timestamp?: string; // Optional ISO string e.g. "2026-10-08T08:15:00"
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckInPayload;

    if (
      !body.internId ||
      typeof body.latitude !== 'number' ||
      typeof body.longitude !== 'number'
    ) {
      return Response.json(
        { error: 'Missing required fields: internId, latitude, longitude' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 1. Verify intern exists
    const intern = getIntern(db, body.internId);
    if (!intern) {
      return Response.json(
        { error: `Intern not found with ID: ${body.internId}` },
        { status: 404 }
      );
    }

    // 2. Resolve date and time
    const dateObj = body.timestamp ? new Date(body.timestamp) : new Date();
    const dateStr = body.timestamp
      ? body.timestamp.split('T')[0]
      : dateObj.toISOString().split('T')[0];

    const timeStr = body.timestamp && body.timestamp.includes('T')
      ? body.timestamp.split('T')[1].slice(0, 8)
      : dateObj.toTimeString().slice(0, 8);

    // 3. Prevent duplicate check-in
    const existing = getAttendanceRecord(db, body.internId, dateStr);
    if (existing && existing.checkInTime) {
      return Response.json(
        { error: `Check-in already recorded for intern ${body.internId} on ${dateStr}` },
        { status: 409 }
      );
    }

    // 4. Retrieve office geofence config
    const config = getOfficeConfig(db);
    if (!config) {
      return Response.json(
        { error: 'Office configuration is not initialized' },
        { status: 500 }
      );
    }

    // 5. Server-side anti-spoofing distance calculation
    const distance = calculateDistanceInMeters(
      { latitude: body.latitude, longitude: body.longitude },
      { latitude: config.targetLatitude, longitude: config.targetLongitude }
    );

    if (distance > config.maxRadiusMeters) {
      return Response.json(
        {
          error: `Outside permitted office geofence radius. Distance: ${distance}m (Max: ${config.maxRadiusMeters}m)`,
          distanceInMeters: distance,
        },
        { status: 403 }
      );
    }

    // 6. Evaluate schedule remarks
    const timeHHmm = timeStr.slice(0, 5);
    const remarkEval = evaluateAttendanceRemarks(timeHHmm, config.workStartTime, 'CHECK_IN');

    const recordId = `att-${body.internId}-${dateStr}`;
    const record: AttendanceRecord = {
      id: recordId,
      internId: body.internId,
      date: dateStr,
      checkInTime: timeStr,
      checkInCoords: { latitude: body.latitude, longitude: body.longitude },
      distanceInMeters: distance,
      status: remarkEval.isViolated ? 'LATE' : 'ON_TIME',
      remarks: remarkEval.remarks,
    };

    recordCheckIn(db, record);

    return Response.json(record, { status: 201 });
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}
