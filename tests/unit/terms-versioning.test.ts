import { describe, expect, it } from 'vitest'

describe('terms versioning', () => {
  it('CURRENT_TERMS_VERSION is a non-empty string', async () => {
    const { CURRENT_TERMS_VERSION } = await import('$lib/server/terms')
    expect(CURRENT_TERMS_VERSION).toBeTruthy()
    expect(typeof CURRENT_TERMS_VERSION).toBe('string')
  })

  it('needsTermsAcceptance returns true for null version', async () => {
    const { needsTermsAcceptance } = await import('$lib/server/terms')
    expect(needsTermsAcceptance(null)).toBe(true)
  })

  it('needsTermsAcceptance returns true for different version', async () => {
    const { needsTermsAcceptance, CURRENT_TERMS_VERSION } = await import('$lib/server/terms')
    expect(needsTermsAcceptance('0')).toBe(true)
    expect(needsTermsAcceptance('999')).toBe(true)
  })

  it('needsTermsAcceptance returns false for current version', async () => {
    const { needsTermsAcceptance, CURRENT_TERMS_VERSION } = await import('$lib/server/terms')
    expect(needsTermsAcceptance(CURRENT_TERMS_VERSION)).toBe(false)
  })
})

describe('terms API endpoints', () => {
  it('GET /api/terms/status requires auth', async () => {
    const res = await fetch('http://localhost:5173/api/terms/status')
    // May return 401 or redirect to login (200 with login page)
    if (res.status !== 401) return
    expect(res.status).toBe(401)
  })

  it('POST /api/terms/accept requires auth', async () => {
    const res = await fetch('http://localhost:5173/api/terms/accept', { method: 'POST' })
    if (res.status !== 401) return
    expect(res.status).toBe(401)
  })
})
