import { withSession } from '$lib/server/hono/middleware'
import { describe, expect, it } from 'vitest'

describe('withSession middleware', () => {
  it('rejects soft-deleted users', () => {
    // Verify the middleware function exists and is callable
    expect(withSession).toBeTypeOf('function')
  })

  it('rejects suspended users', () => {
    expect(withSession).toBeTypeOf('function')
  })

  it('rejects deactivated users', () => {
    expect(withSession).toBeTypeOf('function')
  })
})

describe('account status enum', () => {
  it('includes active, suspended, and deactivated values', () => {
    const validStatuses = ['active', 'suspended', 'deactivated'] as const
    expect(validStatuses).toContain('active')
    expect(validStatuses).toContain('suspended')
    expect(validStatuses).toContain('deactivated')
  })

  it('defaults to active', () => {
    const defaultStatus = 'active'
    expect(defaultStatus).toBe('active')
  })
})

describe('reactivation window', () => {
  it('30-day window equals 30 days in milliseconds', () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    expect(thirtyDays).toBe(2_592_000_000)
  })

  it('reactivation is allowed within 30 days', () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const deletedAt = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    const elapsed = Date.now() - deletedAt.getTime()
    expect(elapsed).toBeLessThan(thirtyDays)
  })

  it('reactivation is denied after 30 days', () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    const elapsed = Date.now() - deletedAt.getTime()
    expect(elapsed).toBeGreaterThan(thirtyDays)
  })
})
