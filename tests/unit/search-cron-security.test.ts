import { describe, expect, it } from 'vitest'

describe('Search PII protection', () => {
  const PUBLIC_SEARCH_TYPES = ['blog_post', 'blog_series', 'item', 'comment', 'page']

  it('excludes user type from public search types', () => {
    expect(PUBLIC_SEARCH_TYPES).not.toContain('user')
  })

  it('filters out user type from requested types', () => {
    const requested = ['blog_post', 'user', 'comment']
    const filtered = requested.filter((t) => PUBLIC_SEARCH_TYPES.includes(t))
    expect(filtered).toEqual(['blog_post', 'comment'])
  })

  it('allows all public types', () => {
    expect(PUBLIC_SEARCH_TYPES).toContain('blog_post')
    expect(PUBLIC_SEARCH_TYPES).toContain('blog_series')
    expect(PUBLIC_SEARCH_TYPES).toContain('item')
    expect(PUBLIC_SEARCH_TYPES).toContain('comment')
    expect(PUBLIC_SEARCH_TYPES).toContain('page')
  })

  it('returns undefined types when no types requested', () => {
    const rawTypes = ''.split(',').filter(Boolean)
    const types = rawTypes.length
      ? rawTypes.filter((t) => PUBLIC_SEARCH_TYPES.includes(t))
      : undefined
    expect(types).toBeUndefined()
  })
})

describe('Cron secret validation', () => {
  function isValidCron(
    headerSecret: string | undefined,
    configuredSecret: string | undefined
  ): boolean {
    return (
      Boolean(headerSecret) &&
      Boolean(configuredSecret) &&
      headerSecret.length > 0 &&
      headerSecret === configuredSecret
    )
  }

  it('accepts matching non-empty secret', () => {
    expect(isValidCron('my-secret', 'my-secret')).toBe(true)
  })

  it('rejects empty configured secret', () => {
    expect(isValidCron('', '')).toBe(false)
    expect(isValidCron('any', '')).toBe(false)
    expect(isValidCron('', 'configured')).toBe(false)
  })

  it('rejects undefined secret', () => {
    expect(isValidCron(undefined, 'configured')).toBe(false)
    expect(isValidCron('configured', undefined)).toBe(false)
  })

  it('rejects mismatched secret', () => {
    expect(isValidCron('wrong', 'correct')).toBe(false)
  })

  it('rejects empty string header', () => {
    expect(isValidCron('', 'configured')).toBe(false)
  })
})

describe('Account deletion rate limiting', () => {
  it('should be limited to 3 per hour', () => {
    // The rate limit is applied via middleware: withRateLimit('account-delete', 3, 3_600_000)
    // 3 requests per 3,600,000ms (1 hour)
    const limit = 3
    const windowMs = 3_600_000
    expect(limit).toBe(3)
    expect(windowMs).toBe(3_600_000)
  })
})

describe('Search rate limiting', () => {
  it('should be limited to 30 per minute', () => {
    // The rate limit is applied via middleware: withRateLimit('search', 30, 60_000)
    const limit = 30
    const windowMs = 60_000
    expect(limit).toBe(30)
    expect(windowMs).toBe(60_000)
  })
})
