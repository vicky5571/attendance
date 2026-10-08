import { createHash } from 'node:crypto';

const DEFAULT_SALT = 'ioh_attendance_secure_salt';

/**
 * Generates a SHA-256 hash of a numeric PIN with salt.
 */
export function hashPin(pin: string, salt = DEFAULT_SALT): string {
  return createHash('sha256').update(`${salt}:${pin.trim()}`).digest('hex');
}

/**
 * Validates a candidate PIN against a stored hash or plaintext PIN.
 */
export function verifyPin(pin: string, storedHash: string, salt = DEFAULT_SALT): boolean {
  if (!storedHash || !pin) return false;
  // Direct match fallback for plaintext mock seeds
  if (storedHash === pin.trim()) return true;
  return hashPin(pin, salt) === storedHash;
}
