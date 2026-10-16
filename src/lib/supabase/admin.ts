/**
 * Supabase Administrative Server Client
 * 
 * Provides an authenticated Supabase client using the Service Role Key
 * for secure server-side operations (bypassing RLS where appropriate).
 * 
 * Uses dynamic resolution to ensure zero-breakage in offline/test environments
 * before npm dependencies are resolved.
 */

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClient: any = null;

/**
 * Returns the singleton Supabase Admin client, or null if unconfigured.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSupabaseAdmin(): Promise<any | null> {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient) return cachedClient;

  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    // Dynamically load to keep offline test suites self-contained
    const { createClient } = await import('@supabase/supabase-js');
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return cachedClient;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize admin client:', err);
    return null;
  }
}

