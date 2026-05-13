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
  } catch (e) {
    console.error('Failed to initialize Firebase', e)
    return false
  }
}
