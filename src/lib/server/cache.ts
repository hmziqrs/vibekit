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

  await Promise.allSettled(
    baseUrls.map(async (path) => {
      try {
        const url = new URL(path, 'https://placeholder')
        await cache.delete(url)
      } catch {
        // Cache purge is best-effort
      }
    })
  )
}
