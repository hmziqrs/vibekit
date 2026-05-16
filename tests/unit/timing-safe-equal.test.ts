import { timingSafeEqual } from '$lib/server/security/timing-safe-equal'
import { describe, expect, it } from 'vitest'

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
  })

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
    expect(timingSafeEqual('abc', 'xbc')).toBe(false)
    expect(timingSafeEqual('aaa', 'aab')).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(timingSafeEqual('short', 'longer')).toBe(false)
    expect(timingSafeEqual('', 'a')).toBe(false)
    expect(timingSafeEqual('a', '')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true)
  })

  it('handles unicode correctly', () => {
    expect(timingSafeEqual('héllo', 'héllo')).toBe(true)
    expect(timingSafeEqual('héllo', 'héllo')).toBe(true)
    expect(timingSafeEqual('日本語', '日本語')).toBe(true)
    expect(timingSafeEqual('日本語', '日本')).toBe(false)
  })

  it('handles secrets that look like cron tokens', () => {
    const secret = 'sec_1234567890abcdef1234567890abcdef'
    expect(timingSafeEqual(secret, secret)).toBe(true)
    expect(timingSafeEqual(secret, 'sec_1234567890abcdef1234567890abcdeg')).toBe(false)
    expect(timingSafeEqual(secret, 'wrong')).toBe(false)
  })
})
