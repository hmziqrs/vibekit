const STORAGE_KEY = 'consent'

let status = $state<'accepted' | 'declined' | null>(null)

function read(): 'accepted' | 'declined' | null {
  if (typeof localStorage === 'undefined') return null
  const val = localStorage.getItem(STORAGE_KEY)
  if (val === 'accepted' || val === 'declined') return val
  return null
}

export function getConsentStatus(): 'accepted' | 'declined' | null {
  return status
}

export function initConsent() {
  status = read()
}

export function acceptConsent() {
  localStorage.setItem(STORAGE_KEY, 'accepted')
  status = 'accepted'
}

export function declineConsent() {
  localStorage.setItem(STORAGE_KEY, 'declined')
  status = 'declined'
}

export function withdrawConsent() {
  localStorage.removeItem(STORAGE_KEY)
  status = null
}
