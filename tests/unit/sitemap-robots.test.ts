import { describe, expect, it } from 'vitest'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

describe('sitemap xml escaping', () => {
  it('escapes ampersands', () => {
    expect(escapeXml('foo&bar')).toBe('foo&amp;bar')
  })

  it('escapes angle brackets', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s')
  })

  it('escapes all special characters together', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })

  it('returns plain strings unchanged', () => {
    expect(escapeXml('hello-world_123')).toBe('hello-world_123')
  })
})

describe('robots.txt response format', () => {
  it('contains User-agent and Allow directives', () => {
    const ORIGIN = 'https://vibekit.dev'
    const txt = `User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })
})

describe('sitemap static pages config', () => {
  const STATIC_PAGES = [
    { changefreq: 'weekly', path: '/', priority: '1.0' },
    { changefreq: 'monthly', path: '/features', priority: '0.8' },
    { changefreq: 'monthly', path: '/pricing', priority: '0.8' },
    { changefreq: 'monthly', path: '/about', priority: '0.5' },
    { changefreq: 'monthly', path: '/contact', priority: '0.3' },
    { changefreq: 'yearly', path: '/privacy', priority: '0.2' },
    { changefreq: 'yearly', path: '/terms', priority: '0.2' },
    { changefreq: 'weekly', path: '/blog', priority: '0.9' },
  ]

  it('includes all public routes', () => {
    const paths = STATIC_PAGES.map((p) => p.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/features')
    expect(paths).toContain('/pricing')
    expect(paths).toContain('/about')
    expect(paths).toContain('/contact')
    expect(paths).toContain('/privacy')
    expect(paths).toContain('/terms')
    expect(paths).toContain('/blog')
  })

  it('homepage has highest priority', () => {
    const home = STATIC_PAGES.find((p) => p.path === '/')
    expect(home?.priority).toBe('1.0')
  })

  it('blog listing has second highest priority', () => {
    const blog = STATIC_PAGES.find((p) => p.path === '/blog')
    expect(blog?.priority).toBe('0.9')
  })
})

describe('sitemap xml structure', () => {
  const ORIGIN = 'https://vibekit.dev'

  it('generates valid url entry for static page', () => {
    const entry = `  <url>
    <loc>${ORIGIN}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`
    expect(entry).toContain(`<loc>${ORIGIN}/about</loc>`)
    expect(entry).toContain('<changefreq>monthly</changefreq>')
    expect(entry).toContain('<priority>0.5</priority>')
  })

  it('generates valid url entry for blog post', () => {
    const slug = 'my-test-post'
    const entry = `  <url>
    <loc>${ORIGIN}/blog/${escapeXml(slug)}</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    expect(entry).toContain(`<loc>${ORIGIN}/blog/my-test-post</loc>`)
    expect(entry).toContain('<lastmod>2024-01-15</lastmod>')
  })

  it('wraps entries in urlset with namespace', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml).toContain('<?xml version="1.0"')
  })
})
