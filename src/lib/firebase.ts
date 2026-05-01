import type { Analytics } from 'firebase/analytics'

let analytics: Analytics | null = null

interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

export async function initFirebase(configJson: string): Promise<boolean> {
  if (!configJson || analytics) {
    return false
  }

  try {
    const config: FirebaseConfig = JSON.parse(configJson)
    const [{ initializeApp, getApp, getApps }, { getAnalytics, isSupported }] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
    ])

    const app = getApps().length ? getApp() : initializeApp(config)

    if (typeof window !== 'undefined') {
      const supported = await isSupported()
      if (supported) {
        analytics = getAnalytics(app)
      }
    }

    return true
  } catch {
    return false
  }
}

export async function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (!analytics) {
    return
  }
  const { logEvent } = await import('firebase/analytics')
  logEvent(analytics, name, params)
}

export function isAnalyticsReady(): boolean {
  return analytics !== null
}
