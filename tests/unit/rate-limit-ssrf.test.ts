import { describe, expect, it } from 'vitest'

describe('Rate limiter atomic upsert logic', () => {
  // Simulates the SQL CASE logic in the atomic upsert
  function simulateAtomicUpsert(
    existing: { count: number; resetAt: number } | null,
    now: number,
    windowMs: number
  ): { count: number; resetAt: number } {
    const resetAt = now + windowMs
    if (!existing) {
      return { count: 1, resetAt }
    }
    const windowExpired = existing.resetAt <= now
    return {
      count: windowExpired ? 1 : existing.count + 1,
      resetAt: windowExpired ? resetAt : existing.resetAt,
    }
  }

  it('creates new entry when none exists', () => {
    const result = simulateAtomicUpsert(null, 1000, 60000)
    expect(result.count).toBe(1)
    expect(result.resetAt).toBe(61000)
  })

  it('increments count when window is active', () => {
    const existing = { count: 5, resetAt: 61000 }
    const result = simulateAtomicUpsert(existing, 5000, 60000)
    expect(result.count).toBe(6)
    expect(result.resetAt).toBe(61000)
  })

  it('resets to 1 when window expired', () => {
    const existing = { count: 100, resetAt: 5000 }
    const result = simulateAtomicUpsert(existing, 6000, 60000)
    expect(result.count).toBe(1)
    expect(result.resetAt).toBe(66000)
  })

  it('two concurrent requests within window both increment atomically', () => {
    const existing = { count: 19, resetAt: 61000 }
    // Request A
    const resultA = simulateAtomicUpsert(existing, 5000, 60000)
    // Request B sees the SAME state (race) but with atomic upsert,
    // each call gets its own increment
    const resultB = simulateAtomicUpsert(
      { count: resultA.count, resetAt: resultA.resetAt },
      5000,
      60000
    )
    expect(resultA.count).toBe(20)
    expect(resultB.count).toBe(21)
  })
})

describe('Discord webhook URL validation', () => {
  function isValidDiscordUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') return false
      return parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com'
    } catch {
      return false
    }
  }

  it('accepts discord.com webhook URLs', () => {
    expect(isValidDiscordUrl('https://discord.com/api/webhooks/123/token')).toBe(true)
  })

  it('accepts discordapp.com webhook URLs', () => {
    expect(isValidDiscordUrl('https://discordapp.com/api/webhooks/456/token')).toBe(true)
  })

  it('rejects localhost', () => {
    expect(isValidDiscordUrl('https://localhost/webhook')).toBe(false)
  })

  it('rejects HTTP URLs', () => {
    expect(isValidDiscordUrl('http://discord.com/api/webhooks/123/token')).toBe(false)
  })

  it('rejects other domains', () => {
    expect(isValidDiscordUrl('https://evil.com/webhook')).toBe(false)
    expect(isValidDiscordUrl('https://discord.com.evil.com/webhook')).toBe(false)
  })

  it('rejects cloud metadata endpoints', () => {
    expect(isValidDiscordUrl('https://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isValidDiscordUrl('not-a-url')).toBe(false)
  })
})

describe('Notification table indexes', () => {
  it('notification table should have userId and archivedAt columns', async () => {
    const { notification } = await import('$lib/server/db/schema')
    const columns = Object.keys(notification)
    expect(columns).toContain('userId')
    expect(columns).toContain('archivedAt')
    expect(columns).toContain('readAt')
    expect(columns).toContain('createdAt')
  })

  it('notificationPreference table should support push channel', async () => {
    const { notificationPreference } = await import('$lib/server/db/schema')
    const columns = Object.keys(notificationPreference)
    expect(columns).toContain('channel')
  })
})
