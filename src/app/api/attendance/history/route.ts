import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { calculateMonthlyTimesheet } from '../../../../lib/services/timesheet.ts';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const internId = searchParams.get('internId');
    const month = searchParams.get('month'); // YYYY-MM

    if (!internId || !month) {
      return Response.json(
        { error: 'Query parameters internId dan month wajib diisi (e.g. ?internId=...&month=2026-10)' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const intern = getIntern(db, internId);
    if (!intern) {
      return Response.json(
        { error: `Intern dengan ID '${internId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    const result = calculateMonthlyTimesheet(db, internId, month);

    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
