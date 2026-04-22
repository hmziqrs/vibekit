import { initFirebase, trackEvent } from './firebase'

let initialized = false

export async function initAnalyticsIfConsented(configJson?: string) {
  if (initialized) return

  const consent = typeof localStorage !== 'undefined' ? localStorage.getItem('consent') : null

  if (consent === 'accepted' && configJson) {
    initialized = await initFirebase(configJson)
  }
}

export function trackPageView(path: string) {
  if (!initialized) return
  trackEvent('page_view', { page_path: path })
}

export function trackAction(action: string, params?: Record<string, unknown>) {
  if (!initialized) return
  trackEvent(action, params)
}
