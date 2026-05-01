export interface CachePlatform {
  caches?: CacheStorage | { default: unknown }
}

export function blogCacheTags(slug?: string, tag?: string): string[] {
  const tags = ['blog:index']
  if (slug) {
    tags.push(`blog:slug:${slug}`)
  }
  if (tag) {
    tags.push(`blog:tag:${tag}`)
  }
  return tags
}

export async function purgeBlogCache(
  platform: CachePlatform | undefined,
  slug?: string
): Promise<void> {
  if (!platform?.caches) {
    return
  }

  const tags = blogCacheTags(slug)
  const cache = (platform.caches as CacheStorage & { default: Cache }).default

  // Purge by reconstructing cache keys — Cloudflare Cache API doesn't support
  // Tag-based purge directly from Workers. We purge known URL patterns instead.
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

export function applyBlogCacheHeaders(response: Response): void {
  response.headers.set(
    'Cache-Control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=60'
  )
  response.headers.set('CDN-Cache-Control', 'public, max-age=3600')
}
