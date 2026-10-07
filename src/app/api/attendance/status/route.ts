import { getDatabase } from '../../../../lib/db/client.ts';
import { getAttendanceRecord } from '../../../../lib/db/repo.ts';

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

  const db = getDatabase();
  const record = getAttendanceRecord(db, internId, dateStr);

  return Response.json({
    checkedIn: Boolean(record?.checkInTime),
    checkedOut: Boolean(record?.checkOutTime),
    record: record || null,
  });
}
