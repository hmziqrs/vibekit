import type { AppServices } from './types'

export type {
  AppServices,
  AppDb,
  CacheClient,
  EmailClient,
  RuntimeEnv,
  StorageClient,
} from './types'

declare const __ADAPTER__: string

export async function createServices(event: {
  platform?: { env?: { DB?: unknown } }
}): Promise<AppServices | null> {
  // Cloudflare Workers: platform.env.DB is the D1 binding
  if (__ADAPTER__ === 'cloudflare') {
    if (event.platform?.env?.DB) {
      const { createCloudflareServices } = await import('../adapter/cloudflare/services')
      return createCloudflareServices(event as Parameters<typeof createCloudflareServices>[0])
    }
    return null
  }

  // Node/Bun self-host: use SQLite + filesystem storage
  const { createNodeServices } = await import('../adapter/node/services')
  return createNodeServices()
}
