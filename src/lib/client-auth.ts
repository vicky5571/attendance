import type { AuthResponse, AuthResponseUser, InternLoginPayload, AdminLoginPayload } from '@/types';

/**
 * Client authentication helper for role-based sessions.
 * Manages JSON requests against Next.js /api/auth routes.
 * Session cookie (ioh_session) is handled automatically via HttpOnly browser cookies.
 */

export async function loginWithCredentials(identifier: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, email: identifier, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login gagal');
  }

  return data as AuthResponse;
}

export async function loginIntern(internId: string, pin: string): Promise<AuthResponse> {
  const payload: InternLoginPayload = {
    role: 'INTERN',
    internId,
    pin,
  };

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login gagal');
  }

  return data as AuthResponse;
}

export async function loginAdmin(identifier: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'ADMIN',
      identifier,
      email: identifier,
      password,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login gagal');
  }

  return data as AuthResponse;
}

export async function fetchCurrentUser(): Promise<AuthResponseUser | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.user as AuthResponseUser;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // silent catch on network issues
  }
}
