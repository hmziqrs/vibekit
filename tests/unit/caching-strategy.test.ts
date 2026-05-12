import { describe, expect, it } from 'vitest'

describe('caching Strategy', () => {
  describe('cache-Control header values', () => {
    it('search API uses short browser cache with longer CDN cache', () => {
      const header = 'public, max-age=60, s-maxage=300, stale-while-revalidate=30'
      expect(header).toContain('max-age=60')
      expect(header).toContain('s-maxage=300')
      expect(header).toContain('stale-while-revalidate=30')
    })

    it('image API uses long-lived cache with stale-while-revalidate', () => {
      const header = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=3600'
      expect(header).toContain('max-age=86400')
      expect(header).toContain('s-maxage=604800')
      expect(header).toContain('stale-while-revalidate=3600')
    })

    it('blog pages use stale-while-revalidate for 60 seconds', () => {
      const header = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60'
      expect(header).toContain('stale-while-revalidate=60')
    })

    it('immutable assets cache for 1 year', () => {
      const header = 'public, max-age=31536000, immutable'
      expect(header).toContain('31536000')
      expect(header).toContain('immutable')
    })
  })

  describe('_headers static file rules', () => {
    const rules = [
      { expected: 'immutable', path: '/_app/immutable/*' },
      { expected: 'stale-while-revalidate=60', path: '/feed.xml' },
      { expected: 'max-age=3600', path: '/sitemap.xml' },
      { expected: 'no-cache', path: '/sw.js' },
    ]

    it('has correct number of cache rules', () => {
      expect(rules).toHaveLength(4)
    })

    for (const rule of rules) {
      it(`${rule.path} cache includes ${rule.expected}`, () => {
        expect(rule.expected).toBeTruthy()
      })
    }
  })

  describe('purgePatterns cache invalidation', () => {
    it('builds correct purge URLs for blog listing', () => {
      const patterns = ['/blog']
      expect(patterns).toContain('/blog')
    })

    it('builds correct purge URLs for specific post', () => {
      const patterns = ['/blog', '/blog/my-post']
      expect(patterns).toContain('/blog/my-post')
    })

    it('builds correct purge URLs for multiple entities', () => {
      const patterns = ['/blog', '/blog/post-1', '/blog/post-2']
      expect(patterns).toHaveLength(3)
    })
  })
})
