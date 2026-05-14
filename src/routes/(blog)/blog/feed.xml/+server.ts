import type { getDb } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { blogPost, blogPostTag, blogTag } from '$lib/server/db/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'

import type { RequestHandler } from './$types'

// Narrow AppDb union to a single type so .select() overload resolution works.
type Db = ReturnType<typeof getDb>

const ORIGIN = 'https://vibekit.dev'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface FeedPost {
  authorName: string | null
  contentBody: string | null
  excerpt: string | null
  id: string
  publishedAt: number | null
  slug: string
  title: string
}

export const GET: RequestHandler = async ({ locals, setHeaders }) => {
  setHeaders({
    'Cache-Control': 'public, max-age=300, s-maxage=3600',
    'Content-Type': 'application/xml; charset=utf-8',
  })

  const db = locals.services.db as Db

  const rows = await db
    .select({
      authorName: user.displayName,
      contentBody: blogPost.contentBody,
      excerpt: blogPost.excerpt,
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      title: blogPost.title,
    })
    .from(blogPost)
    .leftJoin(user, eq(blogPost.authorId, user.id))
    .where(and(eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)))
    .orderBy(desc(blogPost.publishedAt))
    .limit(25)

  const posts = rows as unknown as FeedPost[]

  const items = await Promise.all(
    posts.map(async (post) => {
      const tagRows = await db
        .select({ name: blogTag.name })
        .from(blogPostTag)
        .innerJoin(blogTag, eq(blogPostTag.tagId, blogTag.id))
        .where(eq(blogPostTag.postId, post.id))
      const tags = tagRows as unknown as { name: string }[]

      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date().toUTCString()
      const link = `${ORIGIN}/blog/${post.slug}`
      const description = post.excerpt ?? ''
      const categories = tags.map((t) => `    <category>${escapeXml(t.name)}</category>`).join('\n')

      return `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(description)}</description>
${categories}
  </item>`
    })
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/Atom">
  <channel>
    <title>Vibekit Blog</title>
    <link>${ORIGIN}/blog</link>
    <description>Articles about SvelteKit, Cloudflare, and building SaaS products.</description>
    <language>en</language>
    <atom:link href="${ORIGIN}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`

  return new Response(xml)
}
