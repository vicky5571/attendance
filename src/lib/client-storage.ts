/**
 * Client Storage & Offline-First Persistence Helper
 * Handles localStorage caching for attendance status with SSR/Node in-memory fallback.
 */

export interface CachedAttendance {
  in?: string;
  out?: string;
  remarks?: string;
  status?: string;
  updatedAt?: string;
}

const STORAGE_PREFIX = 'ioh_attendance_';

// In-memory fallback map for non-browser/SSR/test environments
const memoryStore: Record<string, string> = {};

function getItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  return memoryStore[key] || null;
}

function setItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      memoryStore[key] = value;
      return;
    }
  }
  memoryStore[key] = value;
}

function removeItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
      return;
    } catch {
      delete memoryStore[key];
      return;
    }
  }
  delete memoryStore[key];
}

/**
 * Saves attendance record to local storage cache for instant offline hydration.
 */
export function saveAttendanceCache(
  internId: string,
  date: string,
  data: CachedAttendance
): void {
  const key = `${STORAGE_PREFIX}record_${internId}_${date}`;
  setItem(key, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

/**
 * Retrieves attendance record from local storage cache.
 */
export function getAttendanceCache(
  internId: string,
  date: string
): CachedAttendance | null {
  const key = `${STORAGE_PREFIX}record_${internId}_${date}`;
  const raw = getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAttendance;
  } catch {
    return null;
  }
}

/**
 * Persists the user's chosen intern selection across browser refreshes.
 */
export function saveSelectedInternId(internId: string): void {
  setItem(`${STORAGE_PREFIX}selected_intern`, internId);
}

/**
 * Gets the previously selected intern ID or falls back to the default ID.
 */
export function getSelectedInternId(fallbackId: string): string {
  return getItem(`${STORAGE_PREFIX}selected_intern`) || fallbackId;
}

/**
 * Clears memory cache for clean testing isolation.
 */
export function clearAllMemoryCache(): void {
  for (const k of Object.keys(memoryStore)) {
    delete memoryStore[k];
  }
}
