import { describe, expect, it, vi } from 'vitest'

vi.mock<typeof import('$lib/server/db/schema')>(import('$lib/server/db/schema'), () => ({
  comment: {
    authorId: 'author_id',
    content: 'content',
    createdAt: 'created_at',
    id: 'id',
  },
}))

// Mock the db operations that detectSpam uses
function createMockDb(recentComment?: object, recentCount?: { count: number }) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(recentComment ?? null),
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(recentComment ?? null),
          }),
        }),
      }),
    }),
  } as unknown as import('$lib/server/services/types').AppDb
}

function createRateLimitedDb(recentCount: number) {
  let callIdx = 0
  const getFn = vi.fn().mockImplementation(() => {
    callIdx++
    // First call = duplicate check (no dup)
    if (callIdx === 1) return Promise.resolve(null)
    // Second call = rate count check
    return Promise.resolve({ count: recentCount })
  })

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: getFn,
          limit: vi.fn().mockReturnValue({ get: getFn }),
        }),
      }),
    }),
  } as unknown as import('$lib/server/services/types').AppDb
}

function createDuplicateDb() {
  let callIdx = 0
  const getFn = vi.fn().mockImplementation(() => {
    callIdx++
    // First call = duplicate check (found)
    if (callIdx === 1) return Promise.resolve({ id: 'existing-comment' })
    // Second call = rate count check
    return Promise.resolve({ count: 0 })
  })

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: getFn,
          limit: vi.fn().mockReturnValue({ get: getFn }),
        }),
      }),
    }),
  } as unknown as import('$lib/server/services/types').AppDb
}

describe('spam-detector module', () => {
  it('exports detectSpam function', async () => {
    const mod = await import('$lib/server/spam-detector')
    expect(typeof mod.detectSpam).toBe('function')
  })
})

describe('blocked keywords', () => {
  it.each([
    ['viagra', 'blocked_keyword:viagra'],
    ['casino', 'blocked_keyword:casino'],
    ['free money', 'blocked_keyword:free money'],
    ['crypto giveaway', 'blocked_keyword:crypto giveaway'],
    ['double your bitcoin', 'blocked_keyword:double your bitcoin'],
  ])('detects "%s" as blocked keyword', async (keyword, reason) => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: `Hey check this out: ${keyword}!!!`,
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain(reason)
    expect(result.score).toBeGreaterThanOrEqual(30)
  })

  it('does not flag clean content', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'This is a perfectly normal comment about the article.',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.isSpam).toBe(false)
    expect(result.score).toBe(0)
  })
})

describe('excessive links', () => {
  it('flags content with more than 3 links', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Check out http://a.com http://b.com http://c.com http://d.com',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain('excessive_links')
  })

  it('does not flag content with 3 or fewer links', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Check out http://a.com http://b.com http://c.com',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).not.toContain('excessive_links')
  })
})

describe('repeated characters', () => {
  it('flags content with 6+ repeated characters', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Wowwwwwww this is amazing',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain('repeated_characters')
  })

  it('does not flag content with 5 or fewer repeated characters', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Wowwwww this is amazing',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).not.toContain('repeated_characters')
  })
})

describe('excessive caps', () => {
  it('flags content with >70% uppercase letters (10+ letters)', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'THIS IS ABSOLUTELY INCREDIBLE AND AMAZING',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain('excessive_caps')
  })

  it('does not flag short content even if all caps', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'OK',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).not.toContain('excessive_caps')
  })

  it('does not flag mixed case content', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'This is a normal comment with some Words capitalized',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).not.toContain('excessive_caps')
  })
})

describe('too short content', () => {
  it('flags content shorter than 3 characters', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'hi',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain('too_short')
  })

  it('does not flag content 3+ characters', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'hey',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).not.toContain('too_short')
  })
})

describe('duplicate content', () => {
  it('flags duplicate content from same user within 1 hour', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Same comment again',
      db: createDuplicateDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain('duplicate_content')
  })
})

describe('rate exceeded', () => {
  it('flags when user has >10 comments in last hour', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Normal content',
      db: createRateLimitedDb(12),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).toContain('rate_exceeded')
  })

  it('does not flag when user has 10 or fewer comments', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Normal content',
      db: createRateLimitedDb(10),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.reasons).not.toContain('rate_exceeded')
  })
})

describe('spam threshold', () => {
  it('isSpam is true when score >= 50', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Click here now http://a.com http://b.com http://c.com http://d.com',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.isSpam).toBe(true)
  })

  it('isSpam is false when score < 50', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'Great article, thanks for sharing!',
      db: createMockDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.score).toBeLessThan(50)
    expect(result.isSpam).toBe(false)
  })
})

describe('multiple signals compound', () => {
  it('compound score from multiple signals reaches threshold', async () => {
    const { detectSpam } = await import('$lib/server/spam-detector')
    const result = await detectSpam({
      content: 'FREE MONEY wwwwww',
      db: createDuplicateDb(),
      ipAddress: '1.2.3.4',
      userId: 'user-1',
    })
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.isSpam).toBe(true)
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })
})
