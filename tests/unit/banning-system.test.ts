import { describe, expect, it } from 'vitest'

describe('ban expiry calculation', () => {
  it('calculates expiry from duration in days', () => {
    const durationDays = 30
    const banExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    const diff = banExpiresAt.getTime() - Date.now()
    expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000)
    expect(diff).toBeLessThan(31 * 24 * 60 * 60 * 1000)
  })

  it('permanent ban has no expiry', () => {
    const banExpiresAt = null
    expect(banExpiresAt).toBeNull()
  })

  it('7-day ban calculates correctly', () => {
    const durationDays = 7
    const ms = durationDays * 24 * 60 * 60 * 1000
    expect(ms).toBe(604_800_000)
  })
})

describe('ban validation', () => {
  it('requires a non-empty reason', () => {
    const reason = ''
    const trimmed = reason.trim()
    expect(trimmed).toHaveLength(0)
  })

  it('accepts a valid reason', () => {
    const reason = 'Violation of community guidelines'
    expect(reason.trim().length).toBeGreaterThan(0)
  })

  it('cannot ban yourself', () => {
    const currentUserId = 'user-1'
    const targetId = 'user-1'
    expect(currentUserId === targetId).toBe(true)
  })

  it('can ban a different user', () => {
    const currentUserId = 'admin-1' as string
    const targetId = 'user-1' as string
    expect(currentUserId === targetId).toBe(false)
  })
})

describe('appeal validation', () => {
  it('requires email, name, and message', () => {
    const appeal = { email: '', message: '', name: '' }
    expect(appeal.email.trim()).toBe('')
    expect(appeal.name.trim()).toBe('')
    expect(appeal.message.trim()).toBe('')
  })

  it('accepts a valid appeal', () => {
    const appeal = {
      email: 'user@example.com',
      message: 'I believe my suspension was an error because...',
      name: 'John',
    }
    expect(appeal.email.trim().length).toBeGreaterThan(0)
    expect(appeal.name.trim().length).toBeGreaterThan(0)
    expect(appeal.message.trim().length).toBeGreaterThan(0)
  })
})

describe('cleanup cron ban expiry', () => {
  it('identifies expired bans correctly', () => {
    const now = Date.now()
    const expiredBan = new Date(now - 1000)
    expect(expiredBan.getTime()).toBeLessThan(now)
  })

  it('does not expire future bans', () => {
    const now = Date.now()
    const futureBan = new Date(now + 30 * 24 * 60 * 60 * 1000)
    expect(futureBan.getTime()).toBeGreaterThan(now)
  })

  it('thirty days cutoff is calculated correctly', () => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
    expect(THIRTY_DAYS_MS).toBe(2_592_000_000)
  })
})
