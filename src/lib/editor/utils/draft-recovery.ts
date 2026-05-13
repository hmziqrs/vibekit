const DRAFT_KEY_PREFIX = 'vibekit-draft-'

export function saveDraft(id: string, json: object): void {
  try {
    const data = { json, savedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY_PREFIX + id, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save draft', error)
  }
}

export function loadDraft(id: string): { json: object; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to load draft', error)
    return null
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(DRAFT_KEY_PREFIX + id)
  } catch (error) {
    console.error('Failed to clear draft', error)
  }
}

export function hasDraft(id: string): boolean {
  return loadDraft(id) !== null
}
