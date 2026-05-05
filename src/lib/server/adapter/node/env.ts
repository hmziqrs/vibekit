import type { RuntimeEnv } from '../../services/types'

export function readNodeEnv(): RuntimeEnv {
  return {
    betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? '',
    contactNotificationEmail: process.env.CONTACT_NOTIFICATION_EMAIL,
    cronSecret: process.env.CRON_SECRET ?? '',
    origin: process.env.ORIGIN ?? '',
    publicCfWebAnalyticsToken: process.env.PUBLIC_CF_WEB_ANALYTICS_TOKEN,
    publicFirebaseConfig: process.env.PUBLIC_FIREBASE_CONFIG,
  }
}
