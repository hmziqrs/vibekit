import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('consent store', () => {
  let store: string | null

  beforeEach(() => {
    store = null
    const mockStorage = {
      getItem: (key: string) => (key === 'consent' ? store : null),
      setItem: (key: string, value: string) => {
        if (key === 'consent') store = value
      },
      removeItem: (key: string) => {
        if (key === 'consent') store = null
      },
      clear: () => {
        store = null
      },
    }
    vi.stubGlobal('localStorage', mockStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with null when no consent in localStorage', async () => {
    const { getConsentStatus, initConsent } = await import('$lib/consent.svelte')
    initConsent()
    expect(getConsentStatus()).toBeNull()
  })

  it('initializes with accepted from localStorage', async () => {
    localStorage.setItem('consent', 'accepted')
    const { getConsentStatus, initConsent } = await import('$lib/consent.svelte')
    initConsent()
    expect(getConsentStatus()).toBe('accepted')
  })

  it('initializes with declined from localStorage', async () => {
    localStorage.setItem('consent', 'declined')
    const { getConsentStatus, initConsent } = await import('$lib/consent.svelte')
    initConsent()
    expect(getConsentStatus()).toBe('declined')
  })

  it('acceptConsent sets status to accepted', async () => {
    const { getConsentStatus, initConsent, acceptConsent } = await import('$lib/consent.svelte')
    initConsent()
    acceptConsent()
    expect(getConsentStatus()).toBe('accepted')
    expect(localStorage.getItem('consent')).toBe('accepted')
  })

  it('declineConsent sets status to declined', async () => {
    const { getConsentStatus, initConsent, declineConsent } = await import('$lib/consent.svelte')
    initConsent()
    declineConsent()
    expect(getConsentStatus()).toBe('declined')
    expect(localStorage.getItem('consent')).toBe('declined')
  })

  it('withdrawConsent sets status to null', async () => {
    localStorage.setItem('consent', 'accepted')
    const { getConsentStatus, initConsent, withdrawConsent } = await import('$lib/consent.svelte')
    initConsent()
    expect(getConsentStatus()).toBe('accepted')
    withdrawConsent()
    expect(getConsentStatus()).toBeNull()
    expect(localStorage.getItem('consent')).toBeNull()
  })

  it('acceptConsent after declineConsent updates reactively', async () => {
    const { getConsentStatus, initConsent, declineConsent, acceptConsent } =
      await import('$lib/consent.svelte')
    initConsent()
    declineConsent()
    expect(getConsentStatus()).toBe('declined')
    acceptConsent()
    expect(getConsentStatus()).toBe('accepted')
  })

  it('isDoNotTrack returns false when navigator.doNotTrack is not "1"', async () => {
    const { isDoNotTrack } = await import('$lib/consent.svelte')
    expect(isDoNotTrack()).toBe(false)
  })

  it('shouldTrack returns false when no consent is given', async () => {
    const { shouldTrack, initConsent } = await import('$lib/consent.svelte')
    initConsent()
    expect(shouldTrack()).toBe(false)
  })

  it('shouldTrack returns true when consent is accepted', async () => {
    const { shouldTrack, initConsent, acceptConsent } = await import('$lib/consent.svelte')
    initConsent()
    acceptConsent()
    expect(shouldTrack()).toBe(true)
  })

  it('shouldTrack returns false when consent is declined', async () => {
    const { shouldTrack, initConsent, declineConsent } = await import('$lib/consent.svelte')
    initConsent()
    declineConsent()
    expect(shouldTrack()).toBe(false)
  })
})
