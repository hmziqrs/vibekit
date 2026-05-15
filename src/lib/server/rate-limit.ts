import { rateLimitLog } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { eq, lte } from 'drizzle-orm'

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

  // Try to insert a new row. If key exists and not expired, increment count.
  const existing = await db.select().from(rateLimitLog).where(eq(rateLimitLog.key, key)).get()

  if (!existing || existing.resetAt <= now) {
    // New window — upsert with count=1
    await db
      .insert(rateLimitLog)
      .values({ count: 1, key, resetAt })
      .onConflictDoUpdate({ set: { count: 1, resetAt }, target: [rateLimitLog.key] })
      .run()
    return { allowed: true, remaining: limit - 1 }
  }

  // Existing window — increment
  const newCount = existing.count + 1
  await db.update(rateLimitLog).set({ count: newCount }).where(eq(rateLimitLog.key, key)).run()

  if (newCount > limit) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: limit - newCount }
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
  db: DrizzleDb | null | undefined,
  key: string,
  limit = 20,
  windowMs = 60_000
): Promise<{ allowed: boolean; remaining: number }> {
  if (!db) return memoryRateLimit(key, limit, windowMs)
  return dbRateLimit(db, { key, limit, windowMs })
}
