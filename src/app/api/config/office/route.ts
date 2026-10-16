import { getDatabase } from '../../../../lib/db/client.ts';
import { getOfficeConfig, setOfficeConfig } from '../../../../lib/db/repo.ts';
import { isSupabaseConfigured } from '../../../../lib/supabase/admin.ts';
import {
  getOfficeConfigFromSupabase,
  upsertOfficeConfigToSupabase,
} from '../../../../lib/db/supabase-repo.ts';
import type { OfficeConfig } from '../../../../types/index.ts';

const DEFAULT_OFFICE_CONFIG: OfficeConfig = {
  targetLatitude: -6.180495,
  targetLongitude: 106.822769,
  maxRadiusMeters: 50,
  workStartTime: '08:00',
  workEndTime: '17:00',
  emailAtasan: process.env.EMAIL_ATASAN || '',
};

export async function GET() {
  try {
    let config: OfficeConfig | null = null;
    if (isSupabaseConfigured()) {
      config = await getOfficeConfigFromSupabase();
    }
    if (!config) {
      const db = getDatabase();
      config = getOfficeConfig(db);
    }
    return Response.json(config || DEFAULT_OFFICE_CONFIG);
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { emailAtasan } = body;

    let currentConfig: OfficeConfig | null = null;
    if (isSupabaseConfigured()) {
      currentConfig = await getOfficeConfigFromSupabase();
    }
    if (!currentConfig) {
      const db = getDatabase();
      currentConfig = getOfficeConfig(db);
    }

    const updatedConfig: OfficeConfig = {
      ...(currentConfig || DEFAULT_OFFICE_CONFIG),
      emailAtasan: typeof emailAtasan === 'string' ? emailAtasan.trim() : (currentConfig?.emailAtasan || ''),
    };

    if (isSupabaseConfigured()) {
      await upsertOfficeConfigToSupabase(updatedConfig);
    }

    const db = getDatabase();
    try {
      setOfficeConfig(db, updatedConfig);
    } catch {}

    return Response.json({
      success: true,
      config: updatedConfig,
    });
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

