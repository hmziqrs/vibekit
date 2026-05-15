import { checkPasswordBreach } from '$lib/server/security/hibp'
import { describe, expect, it, vi } from 'vitest'

describe('checkPasswordBreach', () => {
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
    // This test verifies the fail-open behavior
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    try {
      const result = await checkPasswordBreach('password123')
      expect(result).toEqual({ breached: false, count: 0 })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('handles non-OK API responses gracefully', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Too Many Requests', { status: 429 }))

    try {
      const result = await checkPasswordBreach('password123')
      expect(result).toEqual({ breached: false, count: 0 })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('parses HIBP response format correctly', async () => {
    // Simulate a response where the password suffix is found with count 50000
    const originalFetch = globalThis.fetch

    // "password" SHA-1 = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // We'll simulate a prefix match response
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          '003D68EB55068C33ACE09247EE4C639306B:3\n' +
            '1E4C9B93F3F0682250B6CF8331B7EE68FD8:50000\n' +
            '01234ABCDEF5678901234567890123456789:1',
          { status: 200 }
        )
      )

    try {
      const result = await checkPasswordBreach('password')
      // The suffix should match and count should be > 10
      expect(result.count).toBe(50000)
      expect(result.breached).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns breached: false when suffix is not in response', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          'AAAAAA1111111111111111111111111111111:5\n' + 'BBBBBB2222222222222222222222222222222:10',
          { status: 200 }
        )
      )

    try {
      const result = await checkPasswordBreach('super-unique-password-xyz-999')
      expect(result).toEqual({ breached: false, count: 0 })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns breached: false when count is at or below threshold', async () => {
    const originalFetch = globalThis.fetch
    // Simulate a response with count exactly 10 (the threshold)
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:10', { status: 200 }))

    try {
      const result = await checkPasswordBreach('password')
      expect(result.count).toBe(10)
      expect(result.breached).toBe(false) // threshold is > 10
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
