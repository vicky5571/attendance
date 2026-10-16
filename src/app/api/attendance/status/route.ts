import { getDatabase } from '../../../../lib/db/client.ts';
import { getAttendanceRecord, deleteAttendanceRecord } from '../../../../lib/db/repo.ts';
import { isSupabaseConfigured } from '../../../../lib/supabase/admin.ts';
import {
  getAttendanceRecordFromSupabase,
  deleteAttendanceRecordInSupabase,
} from '../../../../lib/db/supabase-repo.ts';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  const dateParam = url.searchParams.get('date');

  if (!internId) {
    return Response.json(
      { error: 'Missing required query parameter: internId' },
      { status: 400 }
    );
  }

  const dateStr = dateParam || new Date().toISOString().split('T')[0];

  let record = isSupabaseConfigured() ? await getAttendanceRecordFromSupabase(internId, dateStr) : null;
  const db = getDatabase();
  if (!record) {
    record = getAttendanceRecord(db, internId, dateStr);
  }

  return Response.json({
    checkedIn: Boolean(record?.checkInTime),
    checkedOut: Boolean(record?.checkOutTime),
    record: record || null,
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  const dateParam = url.searchParams.get('date');

  if (!internId) {
    return Response.json(
      { error: 'Missing required query parameter: internId' },
      { status: 400 }
    );
  }

  const dateStr = dateParam || new Date().toISOString().split('T')[0];

  if (isSupabaseConfigured()) {
    await deleteAttendanceRecordInSupabase(internId, dateStr);
  }

  try {
    const db = getDatabase();
    deleteAttendanceRecord(db, internId, dateStr);
  } catch {}

  return Response.json({
    message: 'Attendance record reset successfully',
    internId,
    date: dateStr,
  });
}
