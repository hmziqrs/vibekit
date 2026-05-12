# Caching Strategy — Implementation Plan

## What exists

- CacheClient interface with purgeBlog()
- Cloudflare Cache API purge implementation
- Blog pages: stale-while-revalidate headers
- CDN-served media: immutable with 1-year max-age
- In-memory breached password cache with TTL
- Cache purges on all blog mutation routes

## What's needed

1. \_headers file for static asset edge caching
2. Expand CacheClient to support API response caching patterns
3. Add Cache-Control headers to public API routes (search, image)
4. Cache invalidation helper for items (beyond blog posts)
5. Cache middleware for hono public routes

## Files to Create

1. `static/_headers` — Cloudflare Pages edge caching rules

## Files to Modify

1. `src/lib/server/services/types.ts` — expand CacheClient
2. `src/lib/server/cache.ts` — add purgePatterns method
3. `src/lib/server/hono/index.ts` — add cache headers to public routes
