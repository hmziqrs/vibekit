import { clearBreachedCache, isBreachedPassword } from '$lib/server/breached-password'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe(isBreachedPassword, () => {
  beforeEach(() => {
    clearBreachedCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns breached=false, checked=true for a strong uncommon password', async () => {
    const result = await isBreachedPassword('K#9m$Xp!2vLqZ7nR')
    expect(result.checked).toBe(true)
    expect(result.breached).toBe(false)
  })

  it('returns breached=true for known breached password "password"', async () => {
    const result = await isBreachedPassword('password')
    expect(result.checked).toBe(true)
    expect(result.breached).toBe(true)
  })

  it('returns breached=true for known breached password "123456"', async () => {
    const result = await isBreachedPassword('123456')
    expect(result.checked).toBe(true)
    expect(result.breached).toBe(true)
  })

  it('returns checked=false on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const result = await isBreachedPassword('anything')
    expect(result.checked).toBe(false)
    expect(result.breached).toBe(false)
  })

  it('returns checked=false on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }))
    const result = await isBreachedPassword('anything')
    expect(result.checked).toBe(false)
    expect(result.breached).toBe(false)
  })

  it('caches results for same password', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++
      return new Response('SUFFIX1:5\nSUFFIX2:3', { status: 200 })
    })

    const first = await isBreachedPassword('same-password-check')
    const second = await isBreachedPassword('same-password-check')
    expect(callCount).toBe(1)
    expect(first.checked).toBe(true)
    expect(second.checked).toBe(true)
  })

  it('detects breached password from API response', async () => {
    const hash = 'A9993E364706816ABA3E25717850C26C9CD0D89D'
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`${suffix}:5\nOTHERSUFFIX:2`, { status: 200 })
    )
    const result = await isBreachedPassword('abc')
    expect(result.checked).toBe(true)
    expect(result.breached).toBe(true)
  })

  it('detects non-breached password from API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('NOSUFFIX1:5\nNOSUFFIX2:3', { status: 200 })
    )
    const result = await isBreachedPassword('unique-secure-password-xyz')
    expect(result.checked).toBe(true)
    expect(result.breached).toBe(false)
  })

  it('handles rate limiting (429) gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Too Many Requests', { status: 429 })
    )
    const result = await isBreachedPassword('anything')
    expect(result.checked).toBe(false)
    expect(result.breached).toBe(false)
  })

  it('clears expired cache entries', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++
      return new Response('SUFFIX:5', { status: 200 })
    })

    await isBreachedPassword('test-password')

    // Manually expire the cache entry
    const { clearBreachedCache } = await import('$lib/server/breached-password')
    clearBreachedCache()

    await isBreachedPassword('test-password')
    expect(callCount).toBe(2)
  })
})
