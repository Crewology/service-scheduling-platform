import { drizzle } from "drizzle-orm/mysql2";

let _db: ReturnType<typeof drizzle> | null = null;
let _lastAttempt: number = 0;
const MIN_RETRY_MS = 3000; // Wait at least 3s between reconnection attempts

/**
 * Lazily create the drizzle instance with automatic retry on failure.
 *
 * Previous bug: on connection failure, _db was set to null and cached
 * forever — every subsequent call returned null, causing all DB functions
 * to silently return empty arrays/undefined. Now we track the last
 * failure time and retry after MIN_RETRY_MS.
 */
export async function getDb() {
  if (_db) return _db;

  // Throttle reconnection attempts
  const now = Date.now();
  if (_lastAttempt && now - _lastAttempt < MIN_RETRY_MS) {
    return null;
  }

  if (process.env.DATABASE_URL) {
    _lastAttempt = now;
    try {
      _db = drizzle(process.env.DATABASE_URL);
      _lastAttempt = 0; // Clear on success
      console.log("[Database] Connection established successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Reset the cached connection so the next getDb() call creates a fresh one.
 * Call this when a query fails with a connection error (ECONNRESET, ETIMEDOUT, etc.).
 */
export function resetDbConnection() {
  _db = null;
  _lastAttempt = 0;
  console.log("[Database] Connection reset — will reconnect on next query");
}

/**
 * Like getDb() but throws a TRPCError-friendly error when the database
 * is unavailable. Use this in tRPC procedures so the frontend receives
 * a proper error (not empty data) and can show retry UI.
 */
export async function requireDb() {
  const db = await getDb();
  if (!db) {
    // Reset so next attempt will try to reconnect
    resetDbConnection();
    throw new Error("Database temporarily unavailable. Please try again.");
  }
  return db;
}
