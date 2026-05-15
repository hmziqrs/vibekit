import { beforeEach, describe, expect, it, vi } from 'vitest'

// Set up env before importing the module
vi.mock('$env/dynamic/private', () => ({
  env: { BETTER_AUTH_SECRET: 'test-secret-for-encryption-min-32-chars!!' },
}))

describe('crypto module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('encrypts and decrypts a token round-trip', async () => {
    const { encryptToken, decryptToken } = await import('$lib/server/crypto')
    const plain = 'ghp_abc123xyz'
    const encrypted = await encryptToken(plain)
    expect(encrypted).not.toBe(plain)
    const decrypted = await decryptToken(encrypted)
    expect(decrypted).toBe(plain)
  })

  it('produces different ciphertexts for the same plaintext', async () => {
    const { encryptToken } = await import('$lib/server/crypto')
    const plain = 'same-token'
    const enc1 = await encryptToken(plain)
    const enc2 = await encryptToken(plain)
    // Random IV means different ciphertext
    expect(enc1).not.toBe(enc2)
  })

  it('isEncrypted detects valid encrypted format', async () => {
    const { encryptToken, isEncrypted } = await import('$lib/server/crypto')
    const encrypted = await encryptToken('test')
    expect(isEncrypted(encrypted)).toBe(true)
  })

  it('isEncrypted rejects plaintext strings', async () => {
    const { isEncrypted } = await import('$lib/server/crypto')
    expect(isEncrypted('plain-text')).toBe(false)
    expect(isEncrypted('')).toBe(false)
    expect(isEncrypted('no-colon')).toBe(false)
  })

  it('decryptToken throws on invalid format', async () => {
    const { decryptToken } = await import('$lib/server/crypto')
    await expect(decryptToken('invalid')).rejects.toThrow('Invalid encrypted token format')
  })

  it('handles empty string encryption', async () => {
    const { encryptToken, decryptToken } = await import('$lib/server/crypto')
    const encrypted = await encryptToken('')
    const decrypted = await decryptToken(encrypted)
    expect(decrypted).toBe('')
  })

  it('handles long tokens', async () => {
    const { encryptToken, decryptToken } = await import('$lib/server/crypto')
    const long = 'x'.repeat(10_000)
    const encrypted = await encryptToken(long)
    const decrypted = await decryptToken(encrypted)
    expect(decrypted).toBe(long)
  })
})
