import { getDatabase } from '../../../../lib/db/client.ts';
import {
  getOfficeConfig,
  getIntern,
  getAttendanceRecord,
  recordCheckOut,
} from '../../../../lib/db/repo.ts';
import { evaluateAttendanceRemarks } from '../../../../lib/geo.ts';
import { enforceInternIdentity } from '../../../../lib/auth-guard.ts';
import { isSupabaseConfigured } from '../../../../lib/supabase/admin.ts';
import {
  getAttendanceRecordFromSupabase,
  getOfficeConfigFromSupabase,
  recordCheckOutInSupabase,
} from '../../../../lib/db/supabase-repo.ts';

interface CheckOutPayload {
  internId: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  pin?: string;
  photoUrl?: string;
  checkOutPhotoUrl?: string;
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

    // 0. Zero-impersonation guard
    const identityCheck = enforceInternIdentity(request, db, body.internId);
    if (!identityCheck.allowed && identityCheck.errorResponse) {
      return identityCheck.errorResponse;
    }

    // 1. Resolve date and time
    const dateObj = body.timestamp ? new Date(body.timestamp) : new Date();
    const dateStr = body.timestamp
      ? body.timestamp.split('T')[0]
      : dateObj.toISOString().split('T')[0];

    const timeStr = body.timestamp && body.timestamp.includes('T')
      ? body.timestamp.split('T')[1].slice(0, 8)
      : dateObj.toTimeString().slice(0, 8);

    // 2. Retrieve existing check-in
    let existing = isSupabaseConfigured() ? await getAttendanceRecordFromSupabase(body.internId, dateStr) : null;
    if (!existing) {
      existing = getAttendanceRecord(db, body.internId, dateStr);
    }

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
    let config = isSupabaseConfigured() ? await getOfficeConfigFromSupabase() : null;
    if (!config) {
      config = getOfficeConfig(db);
    }
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

    if (isSupabaseConfigured()) {
      await recordCheckOutInSupabase(
        body.internId,
        dateStr,
        timeStr,
        coords,
        combinedRemarks,
        body.checkOutPhotoUrl || body.photoUrl
      );
    }

    let updated = null;
    try {
      updated = recordCheckOut(db, body.internId, dateStr, {
        checkOutTime: timeStr,
        checkOutCoords: coords,
        remarks: combinedRemarks,
        checkOutPhotoUrl: body.checkOutPhotoUrl || body.photoUrl,
      });
    } catch {}

    const responsePayload = updated || {
      ...existing,
      checkOutTime: timeStr,
      checkOutCoords: coords,
      remarks: combinedRemarks,
      checkOutPhotoUrl: body.checkOutPhotoUrl || body.photoUrl,
    };

    return Response.json(responsePayload, { status: 200 });
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}
