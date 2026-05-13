const DRAFT_KEY_PREFIX = 'vibekit-draft-'

export function saveDraft(id: string, json: object): void {
  try {
    const data = { json, savedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY_PREFIX + id, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save draft', e)
  }
}

export function loadDraft(id: string): { json: object; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load draft', e)
    return null
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(DRAFT_KEY_PREFIX + id)
  } catch (e) {
    console.error('Failed to clear draft', e)
  }
}

export function hasDraft(id: string): boolean {
  return loadDraft(id) !== null
}
