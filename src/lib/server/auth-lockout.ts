import { eq, sql } from 'drizzle-orm'

import { loginAttempt } from './db/schema'
import type { AppDb } from './services/types'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export interface LockoutStatus {
  locked: boolean
  remainingAttempts: number
}

export async function checkLockout(db: AppDb, email: string): Promise<LockoutStatus> {
  const [row] = await db.select().from(loginAttempt).where(eq(loginAttempt.id, email))

  if (!row) {
    return { locked: false, remainingAttempts: MAX_ATTEMPTS }
  }

  const now = new Date()

  // If lockout has expired, allow access
  if (row.lockedUntil && row.lockedUntil < now) {
    return { locked: false, remainingAttempts: MAX_ATTEMPTS }
  }

  if (row.lockedUntil && row.lockedUntil >= now) {
    return { locked: true, remainingAttempts: 0 }
  }

  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - row.attemptCount),
  }
}

export async function recordFailedAttempt(db: AppDb, email: string): Promise<void> {
  const now = new Date()

  const [existing] = await db.select().from(loginAttempt).where(eq(loginAttempt.id, email))

  if (!existing) {
    await db.insert(loginAttempt).values({
      attemptCount: 1,
      id: email,
      lastAttemptAt: now,
    })
    return
  }

  // Reset counter if outside the attempt window
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MS)
  if (existing.lastAttemptAt < windowStart) {
    await db
      .update(loginAttempt)
      .set({ attemptCount: 1, lastAttemptAt: now, lockedUntil: null })
      .where(eq(loginAttempt.id, email))
    return
  }

  const newCount = existing.attemptCount + 1
  const lockoutUntil =
    newCount >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null

  await db
    .update(loginAttempt)
    .set({
      attemptCount: newCount,
      lastAttemptAt: now,
      lockedUntil: lockoutUntil,
    })
    .where(eq(loginAttempt.id, email))
}

export async function resetAttempts(db: AppDb, email: string): Promise<void> {
  await db
    .update(loginAttempt)
    .set({ attemptCount: 0, lastAttemptAt: new Date(), lockedUntil: null })
    .where(eq(loginAttempt.id, email))
}

export async function clearLockout(db: AppDb, email: string): Promise<void> {
  await db.delete(loginAttempt).where(eq(loginAttempt.id, email))
}

export async function cleanupExpiredAttempts(db: AppDb): Promise<void> {
  await db
    .delete(loginAttempt)
    .where(
      sql`${loginAttempt.lockedUntil} IS NOT NULL AND ${loginAttempt.lockedUntil} < ${new Date()}`
    )
}
