import { initFirebase } from './firebase'

let initialized = $state(false)

export async function initAnalyticsIfConsented(configJson?: string) {
  if (initialized) {
    return
  }

  const consent = typeof localStorage !== 'undefined' ? localStorage.getItem('consent') : null

  if (consent === 'accepted' && configJson) {
    initialized = await initFirebase(configJson)
  }
}
