import { rateLimit } from '$lib/server/rate-limit'
import { describe, expect, it } from 'vitest'

describe('per-key API rate limiting', () => {
  it('rateLimit function allows requests within limit', () => {
    const result = rateLimit(`test:${Date.now()}`, 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('rateLimit function blocks requests over limit', () => {
    const key = `test:block:${Date.now()}`
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    const result = rateLimit(key, 2, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('different keys have independent rate limits', () => {
    const key1 = `test:indep1:${Date.now()}`
    const key2 = `test:indep2:${Date.now()}`
    rateLimit(key1, 1, 60_000)
    const result1 = rateLimit(key1, 1, 60_000)
    const result2 = rateLimit(key2, 1, 60_000)
    expect(result1.allowed).toBe(false)
    expect(result2.allowed).toBe(true)
  })

  it('rate limit resets after window expires', async () => {
    const key = `test:reset:${Date.now()}`
    rateLimit(key, 1, 1)
    const blocked = rateLimit(key, 1, 1)
    expect(blocked.allowed).toBe(false)

    // Wait for the 1ms window to expire
    await new Promise((resolve) => setTimeout(resolve, 10))
    const allowed = rateLimit(key, 1, 1)
    expect(allowed.allowed).toBe(true)
  })

  it('API key rate limit uses correct key prefix', () => {
    const apiKeyId = 'test-key-id-123'
    const key = `apikey:${apiKeyId}`
    const result = rateLimit(key, 100, 60_000)
    expect(result.allowed).toBe(true)
  })

  it('rateLimit returns remaining count for headers', () => {
    const key = `test:remaining:${Date.now()}`
    const r1 = rateLimit(key, 10, 60_000)
    expect(r1.remaining).toBe(9)
    const r2 = rateLimit(key, 10, 60_000)
    expect(r2.remaining).toBe(8)
    const r3 = rateLimit(key, 10, 60_000)
    expect(r3.remaining).toBe(7)
    expect(r3.allowed).toBe(true)
  })
})
