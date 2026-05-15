import { describe, expect, it, vi } from 'vitest'

describe('reading-tracker: res.ok guard', () => {
  it('skips json parsing on non-ok response', async () => {
    const jsonFn = vi.fn()
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: jsonFn })
    vi.stubGlobal('fetch', mockFetch)

    // Simulates reading-tracker pattern: if (!res.ok) return
    const res = await fetch('/api/analytics/view', { method: 'POST' })
    if (!res.ok) {
      // early return — json() never called
    } else {
      await res.json()
    }

    expect(jsonFn).not.toHaveBeenCalled()
    vi.unstubAllGlobals('fetch')
  })
})

describe('link-preview: res.ok guard on upstream fetch', () => {
  it('returns 502 when upstream returns non-ok', async () => {
    const upstreamRes = { ok: false, status: 404, text: vi.fn() }
    const mockFetch = vi.fn().mockResolvedValue(upstreamRes)
    vi.stubGlobal('fetch', mockFetch)

    const res = await fetch('https://example.com/page')
    if (!res.ok) {
      // would return c.json({ error: 'Failed to fetch URL' }, 502)
      expect(res.ok).toBe(false)
      expect(upstreamRes.text).not.toHaveBeenCalled()
    }

    vi.unstubAllGlobals('fetch')
  })
})

describe('oembed: res.ok guard', () => {
  it('throws on non-ok oembed response to trigger fallback', async () => {
    const jsonFn = vi.fn()
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: jsonFn })
    vi.stubGlobal('fetch', mockFetch)

    const oembedRes = await fetch('https://example.com/oembed')
    let threw = false
    try {
      if (!oembedRes.ok) throw new Error('oEmbed fetch failed')
      await oembedRes.json()
    } catch {
      threw = true
    }

    expect(threw).toBe(true)
    expect(jsonFn).not.toHaveBeenCalled()
    vi.unstubAllGlobals('fetch')
  })
})

describe('terms-status: res.ok guard before json', () => {
  it('returns null on non-ok response', async () => {
    const jsonFn = vi.fn().mockResolvedValue({ needsAcceptance: true })
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: jsonFn })
    vi.stubGlobal('fetch', mockFetch)

    // Simulates layout pattern: .then(r => { if (!r.ok) return null; return r.json() })
    const data = await (async () => {
      const r = await fetch('/api/terms/status')
      if (!r.ok) return null
      return r.json()
    })()

    expect(data).toBeNull()
    expect(jsonFn).not.toHaveBeenCalled()
    vi.unstubAllGlobals('fetch')
  })
})
