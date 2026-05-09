import { clearDraft, hasDraft, loadDraft, saveDraft } from '$lib/editor/utils/draft-recovery'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock localStorage for node environment
const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  clear: () => store.clear(),
  getItem: (key: string) => store.get(key) ?? null,
  key: (_index: number) => null,
  get length() {
    return store.size
  },
  removeItem: (key: string) => store.delete(key),
  setItem: (key: string, value: string) => store.set(key, value),
})

describe(saveDraft, () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('saves and loads a draft', () => {
    const json = { content: [] as unknown[], type: 'doc' }
    saveDraft('test-id', json)
    const draft = loadDraft('test-id')
    expect(draft).not.toBeNull()
    expect(draft?.json).toStrictEqual(json)
    expect(draft?.savedAt).toBeTypeOf('number')
  })

  it('returns null when no draft exists', () => {
    expect(loadDraft('nonexistent')).toBeNull()
  })

  it('clears a draft', () => {
    saveDraft('test-id', { type: 'doc' })
    expect(hasDraft('test-id')).toBe(true)
    clearDraft('test-id')
    expect(hasDraft('test-id')).toBe(false)
  })
})

describe(hasDraft, () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('returns false when no draft', () => {
    expect(hasDraft('no-draft')).toBe(false)
  })

  it('returns true when draft exists', () => {
    saveDraft('exists', { type: 'doc' })
    expect(hasDraft('exists')).toBe(true)
  })
})
