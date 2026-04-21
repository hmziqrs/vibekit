import { getDb } from '$lib/server/db'
import { blogPost } from '$lib/server/db/schema'
import { desc, eq, isNull, and } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDb(platform!.env.DB)

  const page = 1
  const limit = 10

  const posts = await db
    .select({
      id: blogPost.id,
      title: blogPost.title,
      slug: blogPost.slug,
      excerpt: blogPost.excerpt,
      coverImageUrl: blogPost.coverImageUrl,
      publishedAt: blogPost.publishedAt,
      createdAt: blogPost.createdAt,
    })
    .from(blogPost)
    .where(and(eq(blogPost.status, 'published'), isNull(blogPost.deletedAt)))
    .orderBy(desc(blogPost.publishedAt))
    .limit(limit)
    .offset(0)

  return { posts }
}
