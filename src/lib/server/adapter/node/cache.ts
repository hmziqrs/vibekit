import type { CacheClient } from '../../services/types'

export function createNodeCache(): CacheClient {
  return {
    async purgeBlog(): Promise<void> {
      // Self-host uses HTTP cache headers + reverse proxy; no app-side purge needed.
    },
    async purgePatterns(): Promise<void> {
      // Self-host uses HTTP cache headers + reverse proxy; no app-side purge needed.
    },
  }
}
