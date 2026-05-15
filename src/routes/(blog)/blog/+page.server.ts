import type { getDb } from '$lib/server/db'
import { blogPost, blogPostTag, blogTag } from '$lib/server/db/schema'
import { and, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

// Narrow AppDb union to a single type so .select() overload resolution works.
type Db = ReturnType<typeof getDb>

export const load: PageServerLoad = async ({ locals, setHeaders, url }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })

  const db = locals.services.db as Db
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = 10
  const offset = (page - 1) * limit
  const q = url.searchParams.get('q')?.trim()
  const tagSlug = url.searchParams.get('tag')?.trim()

  const conditions = [eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)]

  if (q && q.length >= 2) {
    conditions.push(
      or(
        like(blogPost.title, `%${q}%`),
        like(blogPost.excerpt, `%${q}%`),
        like(blogPost.contentBody, `%${q}%`)
      )!
    )
  }

  if (tagSlug) {
    const tag = await db
      .select({ id: blogTag.id })
      .from(blogTag)
      .where(eq(blogTag.slug, tagSlug))
      .get()
    if (tag) {
      // Get post IDs for this tag using a single query
      const taggedIds = await db
        .select({ postId: blogPostTag.postId })
        .from(blogPostTag)
        .where(eq(blogPostTag.tagId, tag.id))
      const postIdArray = taggedIds.map((t) => t.postId)

      if (postIdArray.length > 0) {
        const postConditions = [...conditions, inArray(blogPost.id, postIdArray)]
        const whereClause = and(...postConditions)

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

        const countRow = countResult[0] as unknown as { value: number }
        return { page, posts, q: q || null, tag: tagSlug, tags, total: countRow?.value ?? 0 }
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

  const countRow = countResult[0] as unknown as { value: number }

  return {
    page,
    posts,
    q: q || null,
    tag: tagSlug || null,
    tags,
    total: countRow?.value ?? 0,
  }
}
