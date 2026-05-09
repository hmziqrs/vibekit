const DRAFT_KEY_PREFIX = 'vibekit-draft-'

export function saveDraft(id: string, json: object): void {
  try {
    const data = { json, savedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY_PREFIX + id, JSON.stringify(data))
  } catch {
    // Storage full or unavailable
  }
}

export function loadDraft(id: string): { json: object; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(DRAFT_KEY_PREFIX + id)
  } catch {
    // Storage unavailable
  }
}

export function hasDraft(id: string): boolean {
  return loadDraft(id) !== null
}
