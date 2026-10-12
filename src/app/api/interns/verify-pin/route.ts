import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { verifyPin } from '../../../../lib/auth.ts';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { internId, pin } = body;

    if (!internId || !pin) {
      return Response.json(
        { error: 'Field internId dan pin wajib diisi' },
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

    // If intern has no pin configured yet, consider valid or uninitialized
    if (!intern.pinHash) {
      return Response.json({ valid: true, uninitialized: true }, { status: 200 });
    }

    const isValid = verifyPin(pin, intern.pinHash);
    if (!isValid) {
      return Response.json(
        { valid: false, error: 'PIN tidak valid' },
        { status: 401 }
      );
    }

    return Response.json({ valid: true }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
