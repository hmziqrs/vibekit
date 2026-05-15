import { blogPost, blogTag } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { and, desc, eq, isNull } from 'drizzle-orm'

import type { RequestHandler } from './$types'

const FALLBACK_ORIGIN = 'https://vibekit.dev'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

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

export const GET: RequestHandler = async ({ locals, setHeaders, url }) => {
  setHeaders({
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'application/xml; charset=utf-8',
  })

  const ORIGIN = url.origin || FALLBACK_ORIGIN

  const { db } = locals.services as unknown as { db: DrizzleDb }

  const posts = await db
    .select({
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      updatedAt: blogPost.updatedAt,
    })
    .from(blogPost)
    .where(and(eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)))
    .orderBy(desc(blogPost.publishedAt))

  const tags = await db.select({ slug: blogTag.slug }).from(blogTag).orderBy(blogTag.name)

  const staticEntries = STATIC_PAGES.map(
    (p) => `  <url>
    <loc>${ORIGIN}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )

  const blogEntries = posts.map(
    (p) => `  <url>
    <loc>${ORIGIN}/blog/${escapeXml(p.slug)}</loc>
    <lastmod>${new Date(p.updatedAt ?? p.publishedAt ?? Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
  )

  const tagEntries = tags.map(
    (t) => `  <url>
    <loc>${ORIGIN}/blog?tag=${escapeXml(t.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries.join('\n')}
${blogEntries.join('\n')}
${tagEntries.join('\n')}
</urlset>`

  return new Response(xml)
}
