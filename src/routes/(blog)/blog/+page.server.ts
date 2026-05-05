import { blogPost } from '$lib/server/db/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })

  const { db } = locals.services

  const page = 1
  const limit = 10

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
    .where(and(eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)))
    .orderBy(desc(blogPost.publishedAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return { posts }
}
