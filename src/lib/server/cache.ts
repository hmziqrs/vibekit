export interface CachePlatform {
  caches?: CacheStorage | { default: unknown }
}

export async function purgeBlogCache(
  platform: CachePlatform | undefined,
  slug?: string
): Promise<void> {
  if (!platform?.caches) {
    return
  }

  const cache = (platform.caches as CacheStorage & { default: Cache }).default

  const baseUrls = ['/blog']
  if (slug) {
    baseUrls.push(`/blog/${slug}`)
  }

  await purgeUrls(cache, baseUrls)
}

export async function purgePatternsCache(
  platform: CachePlatform | undefined,
  patterns: string[]
): Promise<void> {
  if (!platform?.caches) {
    return
  }

  const cache = (platform.caches as CacheStorage & { default: Cache }).default
  await purgeUrls(cache, patterns)
}

async function purgeUrls(cache: Cache, paths: string[]): Promise<void> {
  await Promise.allSettled(
    paths.map(async (path) => {
      try {
        const url = new URL(path, 'https://placeholder')
        await cache.delete(url)
      } catch (err) {
        console.error(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
            event: 'cache.purge_failed',
            path,
          })
        )
      }
    })
  )
}
