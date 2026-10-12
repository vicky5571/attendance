import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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

/**
 * Generates a salted scrypt hash for passwords.
 * Format: salt$hash
 */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  const hash = scryptSync(password.trim(), salt, 64).toString('hex');
  return `${salt}$${hash}`;
}

/**
 * Verifies a candidate password against a stored salt$hash format.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const key = scryptSync(password.trim(), salt, 64);
  const keyBuffer = Buffer.from(hash, 'hex');
  if (key.length !== keyBuffer.length) return false;
  return timingSafeEqual(key, keyBuffer);
}

/**
 * Generates a cryptographically secure random session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
