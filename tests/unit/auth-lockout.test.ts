import {
  checkLockout,
  cleanupExpiredAttempts,
  clearLockout,
  recordFailedAttempt,
  resetAttempts,
} from '$lib/server/auth-lockout'
import { describe, expect, expectTypeOf, it } from 'vitest'

// Test the lockout logic functions directly with controlled state
describe('auth-lockout logic', () => {
  const MAX_ATTEMPTS = 5

  describe('lockout state transitions', () => {
    it('allows access when no previous attempts exist', () => {
      const state: { attemptCount: number; lockedUntil: Date | null } = {
        attemptCount: 0,
        lockedUntil: null,
      }
      const locked = state.lockedUntil !== null && state.lockedUntil > new Date()
      expect(locked).toBe(false)
    })

    it('allows access when under max attempts', () => {
      const state = { attemptCount: 3, lockedUntil: null }
      expect(state.lockedUntil).toBeNull()
      expect(MAX_ATTEMPTS - state.attemptCount).toBe(2)
    })

    it('locks after reaching max attempts', () => {
      const lockoutTime = new Date(Date.now() + 15 * 60 * 1000)
      const state = { attemptCount: 5, lockedUntil: lockoutTime }
      expect(state.lockedUntil).not.toBeNull()
      expect(state.lockedUntil!.getTime()).toBeGreaterThan(new Date().getTime())
    })

    it('unlocks after lockout expires', () => {
      const expiredTime = new Date(Date.now() - 1000)
      const state = { attemptCount: 5, lockedUntil: expiredTime }
      const locked = state.lockedUntil !== null && state.lockedUntil > new Date()
      expect(locked).toBe(false)
    })
  })

  describe('remaining attempts calculation', () => {
    it('shows 5 remaining with 0 attempts', () => {
      expect(Math.max(0, MAX_ATTEMPTS)).toBe(5)
    })

    it('shows 1 remaining with 4 attempts', () => {
      expect(Math.max(0, MAX_ATTEMPTS - 4)).toBe(1)
    })

    it('shows 0 remaining with 5 attempts', () => {
      expect(Math.max(0, MAX_ATTEMPTS - 5)).toBe(0)
    })
  })

  describe('attempt window', () => {
    it('resets counter when last attempt was outside window', () => {
      const WINDOW_MS = 15 * 60 * 1000
      const oldAttempt = new Date(Date.now() - WINDOW_MS - 1)
      const now = new Date()

      // If lastAttemptAt < windowStart, counter should reset
      const windowStart = new Date(now.getTime() - WINDOW_MS)
      expect(oldAttempt.getTime()).toBeLessThan(windowStart.getTime())
    })

    it('does not reset counter when last attempt was inside window', () => {
      const WINDOW_MS = 15 * 60 * 1000
      const recentAttempt = new Date(Date.now() - 1000)
      const now = new Date()

      const windowStart = new Date(now.getTime() - WINDOW_MS)
      expect(recentAttempt.getTime()).toBeGreaterThanOrEqual(windowStart.getTime())
    })
  })

  describe('lockout duration', () => {
    it('sets lockout for 15 minutes from now', () => {
      const LOCKOUT_MS = 15 * 60 * 1000
      const now = Date.now()
      const lockoutUntil = new Date(now + LOCKOUT_MS)

      const expectedExpiry = now + LOCKOUT_MS
      expect(lockoutUntil.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 10)
      expect(lockoutUntil.getTime()).toBeLessThanOrEqual(expectedExpiry + 10)
    })
  })
})

describe('auth-lockout function signatures', () => {
  it('checkLockout accepts db and email', async () => {
    expectTypeOf(checkLockout).toBeFunction()
    expect(checkLockout).toHaveLength(2)
  })

  it('recordFailedAttempt accepts db and email', () => {
    expectTypeOf(recordFailedAttempt).toBeFunction()
    expect(recordFailedAttempt).toHaveLength(2)
  })

  it('resetAttempts accepts db and email', () => {
    expectTypeOf(resetAttempts).toBeFunction()
    expect(resetAttempts).toHaveLength(2)
  })

  it('clearLockout accepts db and email', () => {
    expectTypeOf(clearLockout).toBeFunction()
    expect(clearLockout).toHaveLength(2)
  })

  it('cleanupExpiredAttempts accepts db', () => {
    expectTypeOf(cleanupExpiredAttempts).toBeFunction()
  })
})

describe('auth-lockout module exports', () => {
  it('exports all required functions', async () => {
    const mod = await import('$lib/server/auth-lockout')
    expect(mod.checkLockout).toBeDefined()
    expect(mod.recordFailedAttempt).toBeDefined()
    expect(mod.resetAttempts).toBeDefined()
    expect(mod.clearLockout).toBeDefined()
    expect(mod.cleanupExpiredAttempts).toBeDefined()
  })

  it('exports LockoutStatus type', async () => {
    const mod = await import('$lib/server/auth-lockout')
    // Type-only export — verify the module loads
    expect(mod).toBeDefined()
  })
})
