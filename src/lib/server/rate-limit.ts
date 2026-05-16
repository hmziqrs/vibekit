import { rateLimitLog } from '$lib/server/db/schema'
import type { AppDb, DrizzleDb } from '$lib/server/services/types'
import { lte, sql } from 'drizzle-orm'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  key: string
  limit?: number
  windowMs?: number
}

// In-memory fallback for tests / Node adapter
const memoryStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function memoryCleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) memoryStore.delete(key)
  }
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  memoryCleanup()
  const now = Date.now()
  let entry = memoryStore.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs }
    memoryStore.set(key, entry)
  }
  entry.count++
  if (entry.count > limit) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: limit - entry.count }
}

/** D1-backed rate limit using atomic upsert. */
async function dbRateLimit(
  db: DrizzleDb,
  opts: Required<RateLimitOptions>
): Promise<{ allowed: boolean; remaining: number }> {
  const { key, limit, windowMs } = opts
  const now = Date.now()
  const resetAt = now + windowMs

  // Delete expired entries for this key (lazy cleanup)
  await db.delete(rateLimitLog).where(lte(rateLimitLog.resetAt, now)).run()

  // Atomic upsert: insert or increment in a single statement.
  // This eliminates the TOCTOU race where two concurrent requests both
  // SELECT, see the same count, and both increment independently.
  const result = await db
    .insert(rateLimitLog)
    .values({ count: 1, key, resetAt })
    .onConflictDoUpdate({
      set: {
        count: sql`CASE WHEN ${rateLimitLog.resetAt} > ${now} THEN ${rateLimitLog.count} + 1 ELSE 1 END`,
        resetAt: sql`CASE WHEN ${rateLimitLog.resetAt} > ${now} THEN ${rateLimitLog.resetAt} ELSE ${resetAt} END`,
      },
      target: [rateLimitLog.key],
    })
    .returning({ count: rateLimitLog.count })
    .get()

  const currentCount = result?.count ?? 1
  if (currentCount > limit) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: limit - currentCount }
}

/** In-memory rate limit (no DB). Used when db is unavailable (e.g. tests). */
// oxlint-disable-next-line max-params
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  return memoryRateLimit(key, limit, windowMs)
}

/** D1-backed rate limit. Preferred for production — persists across Workers isolates. */
// oxlint-disable-next-line max-params
export async function dbRateLimitCheck(
  db: AppDb | null | undefined,
  key: string,
  limit = 20,
  windowMs = 60_000
): Promise<{ allowed: boolean; remaining: number }> {
  if (!db) return memoryRateLimit(key, limit, windowMs)
  // The D1 variant supports .returning().get(); the Bun/Node variant falls through to memory.
  return dbRateLimit(db as DrizzleDb, { key, limit, windowMs })
}
