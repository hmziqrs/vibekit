import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, _reset } from './rate-limit'

beforeEach(() => {
  _reset()
})

describe('rateLimit', () => {
  it('allows requests within the limit', () => {
    const result = rateLimit('test', 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('tracks remaining requests', () => {
    rateLimit('test', 3, 60_000)
    rateLimit('test', 3, 60_000)
    const result = rateLimit('test', 3, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blocks requests over the limit', () => {
    rateLimit('test', 2, 60_000)
    rateLimit('test', 2, 60_000)
    const result = rateLimit('test', 2, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    vi.useFakeTimers()
    rateLimit('test', 1, 1000)

    // Should be blocked
    expect(rateLimit('test', 1, 1000).allowed).toBe(false)

    // Advance past window
    vi.advanceTimersByTime(1001)
    expect(rateLimit('test', 1, 1000).allowed).toBe(true)

    vi.useRealTimers()
  })

  it('tracks different keys independently', () => {
    expect(rateLimit('key-a', 1, 60_000).allowed).toBe(true)
    expect(rateLimit('key-b', 1, 60_000).allowed).toBe(true)
    expect(rateLimit('key-a', 1, 60_000).allowed).toBe(false)
    expect(rateLimit('key-b', 1, 60_000).allowed).toBe(false)
  })

  it('uses default limit of 20', () => {
    for (let i = 0; i < 20; i++) {
      expect(rateLimit('test').allowed).toBe(true)
    }
    expect(rateLimit('test').allowed).toBe(false)
  })
})
