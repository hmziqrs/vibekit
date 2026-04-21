import { getDb } from '$lib/server/db'
import { blogPost } from '$lib/server/db/schema'
import { desc, isNull } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDb(platform!.env.DB)
  const posts = await db
    .select({
      id: blogPost.id,
      title: blogPost.title,
      slug: blogPost.slug,
      status: blogPost.status,
      publishedAt: blogPost.publishedAt,
      createdAt: blogPost.createdAt,
    })
    .from(blogPost)
    .where(isNull(blogPost.deletedAt))
    .orderBy(desc(blogPost.createdAt))

  return { posts }
}
