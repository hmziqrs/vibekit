import { recordReadingSchema, recordViewSchema } from '$lib/validators/analytics'
import { describe, expect, it } from 'vitest'

describe('recordViewSchema', () => {
  it('validates postId only', () => {
    const result = recordViewSchema.safeParse({ postId: 'abc-123' })
    expect(result.success).toBeTruthy()
  })

  it('validates postId with referrer', () => {
    const result = recordViewSchema.safeParse({
      postId: 'abc-123',
      referrer: 'https://google.com/search',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing postId', () => {
    const result = recordViewSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects empty postId', () => {
    const result = recordViewSchema.safeParse({ postId: '' })
    expect(result.success).toBeFalsy()
  })

  it('trims referrer whitespace', () => {
    const data = recordViewSchema.parse({ postId: 'abc-123', referrer: '  https://google.com  ' })
    expect(data.referrer).toBe('https://google.com')
  })

  it('rejects referrer exceeding 500 chars', () => {
    const result = recordViewSchema.safeParse({ postId: 'abc-123', referrer: 'x'.repeat(501) })
    expect(result.success).toBeFalsy()
  })

  it('referrer is optional', () => {
    const data = recordViewSchema.parse({ postId: 'abc-123' })
    expect(data.referrer).toBeUndefined()
  })
})

describe('recordReadingSchema', () => {
  it('validates progress and readTime', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 50,
      readTime: 120,
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects missing postId', () => {
    const result = recordReadingSchema.safeParse({ progress: 50, readTime: 120 })
    expect(result.success).toBeFalsy()
  })

  it('rejects missing progress', () => {
    const result = recordReadingSchema.safeParse({ postId: 'abc-123', readTime: 120 })
    expect(result.success).toBeFalsy()
  })

  it('rejects missing readTime', () => {
    const result = recordReadingSchema.safeParse({ postId: 'abc-123', progress: 50 })
    expect(result.success).toBeFalsy()
  })

  it('rejects progress below 0', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: -1,
      readTime: 120,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects progress above 100', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 101,
      readTime: 120,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects readTime below 0', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 50,
      readTime: -1,
    })
    expect(result.success).toBeFalsy()
  })

  it('accepts progress of 0', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 0,
      readTime: 0,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts progress of 100', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 100,
      readTime: 600,
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects non-integer progress', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 50.5,
      readTime: 120,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-integer readTime', () => {
    const result = recordReadingSchema.safeParse({
      postId: 'abc-123',
      progress: 50,
      readTime: 120.5,
    })
    expect(result.success).toBeFalsy()
  })
})

describe('reading completion logic', () => {
  function checkCompletion(progress: number, readTime: number): boolean {
    return progress >= 80 && readTime >= 30
  }

  it('marks as completed when progress >= 80 and readTime >= 30', () => {
    expect(checkCompletion(85, 30)).toBeTruthy()
  })

  it('does not mark as completed when progress < 80', () => {
    expect(checkCompletion(75, 60)).toBeFalsy()
  })

  it('does not mark as completed when readTime < 30', () => {
    expect(checkCompletion(90, 20)).toBeFalsy()
  })

  it('boundary: progress exactly 80', () => {
    expect(checkCompletion(80, 30)).toBeTruthy()
  })

  it('boundary: readTime exactly 30', () => {
    expect(checkCompletion(85, 30)).toBeTruthy()
  })
})

describe('referrer domain extraction', () => {
  it('extracts domain from valid URL', () => {
    const referrer = 'https://www.google.com/search?q=test'
    const domain = new URL(referrer).hostname
    expect(domain).toBe('www.google.com')
  })

  it('extracts domain from simple URL', () => {
    const referrer = 'https://twitter.com'
    const domain = new URL(referrer).hostname
    expect(domain).toBe('twitter.com')
  })

  it('handles invalid referrer gracefully', () => {
    const referrer = 'not-a-url'
    let domain: string | null = null
    try {
      domain = new URL(referrer).hostname
    } catch {
      domain = null
    }
    expect(domain).toBeNull()
  })
})
