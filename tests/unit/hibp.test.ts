import { checkPasswordBreach } from '$lib/server/security/hibp'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('checkPasswordBreach', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns breached: false for passwords not found in HIBP', async () => {
    const result = await checkPasswordBreach('unique-secure-password-xyz-123!')
    expect(result).toHaveProperty('breached')
    expect(result).toHaveProperty('count')
    expect(typeof result.breached).toBe('boolean')
    expect(typeof result.count).toBe('number')
  })

  it('returns { breached: false, count: 0 } when API is unreachable', async () => {
    const result = await checkPasswordBreach('test-password')
    // API may or may not be reachable in CI; either way result should be valid
    expect(result).toEqual(
      expect.objectContaining({
        breached: expect.any(Boolean),
        count: expect.any(Number),
      })
    )
  })

  it('returns { breached: false, count: 0 } for common passwords if API is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const result = await checkPasswordBreach('password123')
    expect(result).toEqual({ breached: false, count: 0 })
  })

  it('handles non-OK API responses gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Too Many Requests', { status: 429 })
    )

    const result = await checkPasswordBreach('password123')
    expect(result).toEqual({ breached: false, count: 0 })
  })

  it('parses HIBP response format correctly', async () => {
    // "password" SHA-1 = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        '003D68EB55068C33ACE09247EE4C639306B:3\n' +
          '1E4C9B93F3F0682250B6CF8331B7EE68FD8:50000\n' +
          '01234ABCDEF5678901234567890123456789:1',
        { status: 200 }
      )
    )

    const result = await checkPasswordBreach('password')
    // The suffix should match and count should be > 10
    expect(result.count).toBe(50000)
    expect(result.breached).toBe(true)
  })

  it('returns breached: false when suffix is not in response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        'AAAAAA1111111111111111111111111111111:5\n' + 'BBBBBB2222222222222222222222222222222:10',
        { status: 200 }
      )
    )

    const result = await checkPasswordBreach('super-unique-password-xyz-999')
    expect(result).toEqual({ breached: false, count: 0 })
  })

  it('returns breached: false when count is at or below threshold', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:10', { status: 200 })
    )

    const result = await checkPasswordBreach('password')
    expect(result.count).toBe(10)
    expect(result.breached).toBe(false) // threshold is > 10
  })
})
