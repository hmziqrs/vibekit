import { clearBreachedCache, isBreachedPassword } from '$lib/server/breached-password'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe(isBreachedPassword, () => {
  beforeEach(() => {
    clearBreachedCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false for a strong uncommon password', async () => {
    const result = await isBreachedPassword('K#9m$Xp!2vLqZ7nR')
    expect(result).toBe(false)
  })

  it('returns true for known breached password "password"', async () => {
    const result = await isBreachedPassword('password')
    expect(result).toBe(true)
  })

  it('returns true for known breached password "123456"', async () => {
    const result = await isBreachedPassword('123456')
    expect(result).toBe(true)
  })

  it('returns false gracefully on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(() => new Error('Network error'))
    const result = await isBreachedPassword('anything')
    expect(result).toBe(false)
  })

  it('returns false gracefully on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }))
    const result = await isBreachedPassword('anything')
    expect(result).toBe(false)
  })

  it('caches results for same password', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++
      return new Response('SUFFIX1:5\nSUFFIX2:3', { status: 200 })
    })

    await isBreachedPassword('same-password-check')
    await isBreachedPassword('same-password-check')
    expect(callCount).toBe(1)
  })
})
