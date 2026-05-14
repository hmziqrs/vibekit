import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/db/schema', () => ({
  comment: {
    authorId: 'authorId',
    content: 'content',
    createdAt: 'createdAt',
    id: 'id',
  },
}))

describe('spam-detector deep', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function createMockDb(recentComment: unknown = null, recentCount = 0) {
    let callCount = 0
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockImplementation(() => {
              callCount++
              // First call: duplicate check, second call: rate check
              return callCount === 1
                ? Promise.resolve(recentComment)
                : Promise.resolve(recentCount > 0 ? { count: recentCount } : null)
            }),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(recentComment),
            }),
          }),
        }),
      }),
    } as never
  }

  describe('detectSpam', () => {
    it('returns clean result for normal content', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'This is a perfectly normal comment about the article.',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.isSpam).toBe(false)
      expect(result.score).toBeLessThan(50)
      expect(result.reasons).toEqual([])
    })

    it('detects blocked keywords', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'Buy viagra now for free money!',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.score).toBeGreaterThanOrEqual(30)
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining('blocked_keyword:')])
      )
    })

    it('detects excessive links', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'Check out http://a.com http://b.com http://c.com http://d.com',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).toContain('excessive_links')
      expect(result.score).toBeGreaterThanOrEqual(20)
    })

    it('detects repeated characters', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'Hello!!!!!!!!! That is amazing',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).toContain('repeated_characters')
    })

    it('detects excessive caps', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'THIS IS ALL CAPS AND VERY LOUD AND ANNOYING TEXT',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).toContain('excessive_caps')
    })

    it('does not flag short content as excessive caps', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'OK',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).not.toContain('excessive_caps')
    })

    it('flags very short content', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'ok',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).toContain('too_short')
      expect(result.score).toBeGreaterThanOrEqual(10)
    })

    it('detects duplicate content from same user', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'Same comment again',
        db: createMockDb({ id: 'comment-1' }),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).toContain('duplicate_content')
      expect(result.score).toBeGreaterThanOrEqual(25)
    })

    it('flags as spam when score exceeds threshold', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content:
          'FREE MONEY click here now!!!!!!! http://a.com http://b.com http://c.com http://d.com',
        db: createMockDb({ id: 'c1' }),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.isSpam).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(50)
    })

    it('is case-insensitive for keywords', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'VIAGRA IS THE BEST',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining('blocked_keyword:')])
      )
    })

    it('does not double-count same keyword category', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'viagra viagra viagra',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      const keywordReasons = result.reasons.filter((r: string) => r.startsWith('blocked_keyword:'))
      expect(keywordReasons).toHaveLength(1)
    })

    it('allows content with fewer than 4 links', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'Check http://a.com and http://b.com and http://c.com',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).not.toContain('excessive_links')
    })

    it('does not flag normal punctuation as repeated characters', async () => {
      const { detectSpam } = await import('$lib/server/spam-detector')
      const result = await detectSpam({
        content: 'That is great!!! I agree!!',
        db: createMockDb(),
        ipAddress: '1.2.3.4',
        userId: 'user-1',
      })
      expect(result.reasons).not.toContain('repeated_characters')
    })
  })
})
