import type { AppType } from '$lib/server/hono'
import { hc } from 'hono/client'

export type Client = ReturnType<typeof hc<AppType>>
const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

export const api = hcWithType(
  typeof location !== 'undefined' ? location.origin : 'http://localhost:5173',
  { init: { credentials: 'include' } }
)
