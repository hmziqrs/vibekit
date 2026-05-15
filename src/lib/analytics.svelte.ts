import { shouldTrack } from './consent.svelte'
import { initFirebase } from './firebase'

let initialized = $state(false)

export async function initAnalyticsIfConsented(configJson?: string) {
  if (initialized) {
    return
  }

  if (shouldTrack() && configJson) {
    initialized = await initFirebase(configJson)
  }
}
