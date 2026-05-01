import { getDb } from '$lib/server/db'
import { blogPost } from '$lib/server/db/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, setHeaders }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })

  const db = getDb(platform!.env.DB)

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
    .offset(0)

  return { posts }
}
