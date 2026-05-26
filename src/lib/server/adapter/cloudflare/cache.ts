import { purgeBlogCache, purgePatternsCache } from '$lib/server/cache'
import type { CacheClient } from '$lib/server/services/types'

export function createCloudflareCache(
  platform: { caches?: CacheStorage | { default: unknown } } | undefined
): CacheClient {
  return {
    async purgeBlog(slug?: string): Promise<void> {
      await purgeBlogCache(platform, slug)
    },
    async purgePatterns(patterns: string[]): Promise<void> {
      await purgePatternsCache(platform, patterns)
    },
  }
}
