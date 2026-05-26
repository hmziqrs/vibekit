import { hc } from 'hono/client'

import type { AppType } from './server/hono'

export function createApiClient(fetchFn?: typeof fetch) {
  return hc<AppType>('/', { fetch: fetchFn })
}

export type ApiClient = ReturnType<typeof createApiClient>
