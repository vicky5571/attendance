import { DatabaseSync } from 'node:sqlite';
import { initSchema } from './schema.ts';

let runtimeDb: DatabaseSync | null = null;

/**
 * Creates a SQLite database instance.
 * Defaults to process.env.DATABASE_PATH or './attendance.db'.
 */
export function createDatabase(location?: string): DatabaseSync {
  const defaultPath =
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? '/tmp/attendance.db'
      : './attendance.db';
  const dbPath = location || process.env.DATABASE_PATH || defaultPath;

  try {
    return new DatabaseSync(dbPath);
  } catch (err) {
    console.warn(`[SQLite] Could not open '${dbPath}', falling back to in-memory:`, err);
    return new DatabaseSync(':memory:');
  }
}

/**
 * Returns the singleton database instance for server runtimes.
 */
export function getDatabase(): DatabaseSync {
  if (!runtimeDb) {
    runtimeDb = createDatabase();
    initSchema(runtimeDb);
  }
  return runtimeDb;
}

/**
 * Sets or resets the runtime database instance (primarily for testing).
 */
export function setDatabase(db: DatabaseSync | null): void {
  runtimeDb = db;
}

