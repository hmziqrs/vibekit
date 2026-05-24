import { dbCount, type getDb } from '$lib/server/db'
import { blogPost, blogPostTag, blogTag } from '$lib/server/db/schema'
import { createD1SearchAdapter } from '$lib/server/search/adapter-d1'
import { createSearchService } from '$lib/server/search/service'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

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

  // Use FTS5 for search queries
  if (q && q.length >= 2) {
    const adapter = createD1SearchAdapter(db)
    const searchService = createSearchService(adapter)
    const results = await searchService.search(q, {
      entityTypes: ['blog_post'],
      limit,
      offset,
    })

    const postIds = results.hits.map((h) => h.entityId)

    if (postIds.length === 0) {
      const tags = await db
        .select({ name: blogTag.name, slug: blogTag.slug })
        .from(blogTag)
        .orderBy(blogTag.name)
      return { page, posts: [], q, tag: tagSlug || null, tags, total: 0 }
    }

    const posts = await db
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
      .where(
        and(
          inArray(blogPost.id, postIds),
          eq(blogPost.status, 'published'),
          isNull(blogPost.deletedAt)
        )
      )
      .orderBy(desc(blogPost.publishedAt))

    const tags = await db
      .select({ name: blogTag.name, slug: blogTag.slug })
      .from(blogTag)
      .orderBy(blogTag.name)

    return { page, posts, q, tag: tagSlug || null, tags, total: results.total }
  }

  const conditions = [eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)]

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

        const [total, posts] = await Promise.all([
          dbCount(db, blogPost, whereClause),
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

  const [total, posts] = await Promise.all([
    dbCount(db, blogPost, whereClause),
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
    total,
  }
}
