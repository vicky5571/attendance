import { DatabaseSync } from 'node:sqlite';

let runtimeDb: DatabaseSync | null = null;

/**
 * Creates a SQLite database instance.
 * Defaults to process.env.DATABASE_PATH or './attendance.db'.
 */
export function createDatabase(location?: string): DatabaseSync {
  const dbPath = location || process.env.DATABASE_PATH || './attendance.db';
  return new DatabaseSync(dbPath);
}

/**
 * Returns the singleton database instance for server runtimes.
 */
export function getDatabase(): DatabaseSync {
  if (!runtimeDb) {
    runtimeDb = createDatabase();
  }
  return runtimeDb;
}
