import { describe, expect, it, vi } from 'vitest'

// Mock the DB module for ban evasion detection
vi.mock('$lib/server/db/schema', () => ({
  user: {
    banExpiresAt: 'ban_expires_at',
    banReason: 'ban_reason',
    createdAt: 'created_at',
    email: 'email',
    status: 'status',
  },
}))

vi.mock('$lib/server/audit', () => ({
  writeAuditLog: vi.fn(),
}))

describe('detectBanEvasion', () => {
  it('returns no matches when no banned users exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }

    const { detectBanEvasion } = await import('$lib/server/security/ban-evasion')
    const result = await detectBanEvasion(
      mockDb as unknown as Parameters<typeof detectBanEvasion>[0],
      'new@example.com',
      '1.2.3.4'
    )

    expect(result.flagged).toBe(false)
    expect(result.matches).toHaveLength(0)
  })

  it('flags same local part with different domain', async () => {
    const bannedUsers = [{ banReason: 'spam', email: 'john@gmail.com' }]
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(bannedUsers),
          }),
        }),
      }),
    }

    const { detectBanEvasion } = await import('$lib/server/security/ban-evasion')
    const result = await detectBanEvasion(
      mockDb as unknown as Parameters<typeof detectBanEvasion>[0],
      'john+1@gmail.com',
      '1.2.3.4'
    )

    // Same normalized local part on same domain should flag
    expect(result.flagged).toBe(true)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].matchType).toBe('email_local')
  })

  it('detects domain-level match without flagging', async () => {
    const bannedUsers = [{ banReason: 'abuse', email: 'badguy@evilcorp.com' }]
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(bannedUsers),
          }),
        }),
      }),
    }

    const { detectBanEvasion } = await import('$lib/server/security/ban-evasion')
    const result = await detectBanEvasion(
      mockDb as unknown as Parameters<typeof detectBanEvasion>[0],
      'different@evilcorp.com',
      '1.2.3.4'
    )

    // Same domain but different local part is a weak signal
    expect(result.flagged).toBe(false)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].matchType).toBe('email_domain')
  })

  it('returns empty for malformed email', async () => {
    const { detectBanEvasion } = await import('$lib/server/security/ban-evasion')
    const result = await detectBanEvasion(
      {} as Parameters<typeof detectBanEvasion>[0],
      'not-an-email',
      '1.2.3.4'
    )

    expect(result.flagged).toBe(false)
    expect(result.matches).toHaveLength(0)
  })
})
