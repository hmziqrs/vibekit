import { describe, expect, it } from 'vitest'

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('visitor hash privacy', () => {
  it('produces a 64-char hex string', async () => {
    const hash = await sha256('127.0.0.1:Mozilla/5.0')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same input', async () => {
    const input = '192.168.1.1:Chrome/120'
    const hash1 = await sha256(input)
    const hash2 = await sha256(input)
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different inputs', async () => {
    const hash1 = await sha256('1.1.1.1:Firefox')
    const hash2 = await sha256('2.2.2.2:Chrome')
    expect(hash1).not.toBe(hash2)
  })

  it('does not leak the original IP or user agent', async () => {
    const ip = '10.0.0.42'
    const ua = 'SensitiveBrowser/1.0'
    const hash = await sha256(`${ip}:${ua}`)
    expect(hash).not.toContain(ip)
    expect(hash).not.toContain(ua)
  })

  it('handles empty input', async () => {
    const hash = await sha256('')
    expect(hash).toHaveLength(64)
  })
})
