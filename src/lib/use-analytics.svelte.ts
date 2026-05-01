import { initAnalyticsIfConsented } from './analytics.svelte'

let initializing = $state(false)

export function useAnalytics(configJson?: string) {
  if (initializing) {
    return
  }
  if (typeof localStorage === 'undefined') {
    return
  }

  const consent = localStorage.getItem('consent')
  if (consent === 'accepted' && configJson) {
    initializing = true
    initAnalyticsIfConsented(configJson).finally(() => {
      initializing = false
    })
  }
}
