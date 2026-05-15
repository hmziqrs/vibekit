import type { getDb } from '$lib/server/db'
import { blogPost, blogPostTag, blogTag } from '$lib/server/db/schema'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

type Db = ReturnType<typeof getDb>

export const load: PageServerLoad = async ({ locals, params, setHeaders, url }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60',
  })

  const db = locals.services.db as Db
  const { slug } = params
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = 10
  const offset = (page - 1) * limit

  const [tagRow] = await db
    .select({ id: blogTag.id, name: blogTag.name, slug: blogTag.slug })
    .from(blogTag)
    .where(eq(blogTag.slug, slug))
    .limit(1)

  if (!tagRow) {
    return { page, posts: [], tag: null, tags: [], total: 0 }
  }

  const taggedIds = await db
    .select({ postId: blogPostTag.postId })
    .from(blogPostTag)
    .where(eq(blogPostTag.tagId, tagRow.id))
  const idSet = new Set(taggedIds.map((t) => t.postId))

  if (idSet.size === 0) {
    const tags = await db
      .select({ name: blogTag.name, slug: blogTag.slug })
      .from(blogTag)
      .orderBy(blogTag.name)
    return { page, posts: [], tag: tagRow, tags, total: 0 }
  }

  const conditions = and(eq(blogPost.status, 'published'), isNull(blogPost.deletedAt))

  const allPosts = await db
    .select({
      coverImageUrl: blogPost.coverImageUrl,
      createdAt: blogPost.createdAt,
      excerpt: blogPost.excerpt,
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      title: blogPost.title,
    })
    .from(blogPost)
    .where(conditions)
    .orderBy(desc(blogPost.publishedAt))

  const filtered = allPosts.filter((p) => idSet.has(p.id))
  const total = filtered.length
  const posts = filtered.slice(offset, offset + limit)

  const tags = await db
    .select({ name: blogTag.name, slug: blogTag.slug })
    .from(blogTag)
    .orderBy(blogTag.name)

  return { page, posts, tag: tagRow, tags, total }
}
