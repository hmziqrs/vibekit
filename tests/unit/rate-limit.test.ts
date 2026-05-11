import { rateLimit } from '$lib/server/rate-limit'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe(rateLimit, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const result = rateLimit('test-allow', 5, 60_000)
    expect(result.allowed).toBeTruthy()
    expect(result.remaining).toBe(4)
  })

  it('tracks remaining requests', () => {
    const key = 'test-remaining'
    rateLimit(key, 3, 60_000)
    rateLimit(key, 3, 60_000)
    const result = rateLimit(key, 3, 60_000)
    expect(result.allowed).toBeTruthy()
    expect(result.remaining).toBe(0)
  })

  it('blocks requests over the limit', () => {
    const key = 'test-block'
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    const result = rateLimit(key, 2, 60_000)
    expect(result.allowed).toBeFalsy()
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    vi.useFakeTimers()
    const key = 'test-reset'
    rateLimit(key, 1, 1000)

    expect(rateLimit(key, 1, 1000).allowed).toBeFalsy()

    vi.advanceTimersByTime(1001)
    const result = rateLimit(key, 1, 1000)
    expect(result.allowed).toBeTruthy()
    expect(result.remaining).toBe(0)
  })

  it('tracks different keys independently', () => {
    expect(rateLimit('key-a-unique', 1, 60_000).allowed).toBeTruthy()
    expect(rateLimit('key-b-unique', 1, 60_000).allowed).toBeTruthy()
    expect(rateLimit('key-a-unique', 1, 60_000).allowed).toBeFalsy()
    expect(rateLimit('key-b-unique', 1, 60_000).allowed).toBeFalsy()
  })

  it('uses default limit of 20', () => {
    const key = 'test-default-limit'
    for (let i = 0; i < 20; i++) {
      expect(rateLimit(key).allowed).toBeTruthy()
    }
    expect(rateLimit(key).allowed).toBeFalsy()
  })
})
