import { initAnalyticsIfConsented } from './analytics.svelte'

let initializing = false

export function useAnalytics(configJson?: string) {
	if (initializing) return

	// Effects do not run on the server, but we guard localStorage access anyway
	if (typeof localStorage === 'undefined') return

	const consent = localStorage.getItem('consent')
	if (consent === 'accepted' && configJson) {
		initializing = true
		initAnalyticsIfConsented(configJson).catch(() => {
			initializing = false
		})
	}
}
