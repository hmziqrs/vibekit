import { purgeBlogCache } from '../../cache'
import type { CacheClient } from '../../services/types'

export function createCloudflareCache(
  platform: { caches?: CacheStorage | { default: unknown } } | undefined
): CacheClient {
  return {
    async purgeBlog(slug?: string): Promise<void> {
      await purgeBlogCache(platform, slug)
    },
  }
}
