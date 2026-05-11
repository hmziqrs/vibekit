import { blogPost, blogPostTag, blogTag } from '$lib/server/db/schema'
import { and, desc, eq, isNull, like, or, sql } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, setHeaders, url }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })

  const { db } = locals.services
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = 10
  const offset = (page - 1) * limit
  const q = url.searchParams.get('q')?.trim()
  const tagSlug = url.searchParams.get('tag')?.trim()

  const conditions = [eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)]

  if (q && q.length >= 2) {
    conditions.push(or(like(blogPost.title, `%${q}%`), like(blogPost.excerpt, `%${q}%`))!)
  }

  if (tagSlug) {
    const tag = await db
      .select({ id: blogTag.id })
      .from(blogTag)
      .where(eq(blogTag.slug, tagSlug))
      .get()
    if (tag) {
      const taggedIds = await db
        .select({ postId: blogPostTag.postId })
        .from(blogPostTag)
        .where(eq(blogPostTag.tagId, tag.id))
      const idSet = new Set(taggedIds.map((t) => t.postId))
      if (idSet.size > 0) {
        // Drizzle doesn't support inArray with a set directly in and(), so filter after
        const whereClause = and(...conditions)
        const [_countResult, allPosts] = await Promise.all([
          db
            .select({ value: sql<number>`count(*)` })
            .from(blogPost)
            .where(whereClause),
          db
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
            .where(whereClause)
            .orderBy(desc(blogPost.publishedAt)),
        ])
        const filtered = allPosts.filter((p) => idSet.has(p.id))
        const total = filtered.length
        const posts = filtered.slice(offset, offset + limit)

        const tags = await db
          .select({ name: blogTag.name, slug: blogTag.slug })
          .from(blogTag)
          .orderBy(blogTag.name)

        return { page, posts, q: q || null, tag: tagSlug, tags, total }
      }
    }
    // Tag not found or no posts with that tag
    const tags = await db
      .select({ name: blogTag.name, slug: blogTag.slug })
      .from(blogTag)
      .orderBy(blogTag.name)
    return { page, posts: [], q: q || null, tag: tagSlug, tags, total: 0 }
  }

  const whereClause = and(...conditions)

  const [countResult, posts] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)` })
      .from(blogPost)
      .where(whereClause),
    db
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
      .where(whereClause)
      .orderBy(desc(blogPost.publishedAt))
      .limit(limit)
      .offset(offset),
  ])

  const tags = await db
    .select({ name: blogTag.name, slug: blogTag.slug })
    .from(blogTag)
    .orderBy(blogTag.name)

  return {
    page,
    posts,
    q: q || null,
    tag: tagSlug || null,
    tags,
    total: countResult[0]?.value ?? 0,
  }
}
