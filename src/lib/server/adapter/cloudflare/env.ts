import type { RuntimeEnv } from '$lib/server/services/types'

export function readCloudflareEnv(env: Env): RuntimeEnv {
  return {
    betterAuthSecret: (env.BETTER_AUTH_SECRET as string) ?? '',
    contactNotificationEmail: env.CONTACT_NOTIFICATION_EMAIL as string | undefined,
    cronSecret: (env.CRON_SECRET as string) ?? '',
    origin: (env.ORIGIN as string) ?? '',
    publicCfWebAnalyticsToken: env.PUBLIC_CF_WEB_ANALYTICS_TOKEN as string | undefined,
    publicFirebaseConfig: env.PUBLIC_FIREBASE_CONFIG as string | undefined,
  }
}
