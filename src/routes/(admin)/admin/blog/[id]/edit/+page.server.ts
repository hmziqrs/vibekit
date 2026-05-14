import { blogPost, blogPostSeries, blogPostTag, blogSeries, blogTag } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const db = locals.services.db as DrizzleDb
  const post = await db.select().from(blogPost).where(eq(blogPost.id, params.id)).get()

  if (!post) {
    throw error(404, 'Post not found')
  }

  const [postTags, postSeries] = await Promise.all([
    db
      .select({ id: blogTag.id, name: blogTag.name })
      .from(blogPostTag)
      .innerJoin(blogTag, eq(blogPostTag.tagId, blogTag.id))
      .where(eq(blogPostTag.postId, post.id)),
    db
      .select({
        id: blogSeries.id,
        name: blogSeries.name,
        sortOrder: blogPostSeries.sortOrder,
      })
      .from(blogPostSeries)
      .innerJoin(blogSeries, eq(blogPostSeries.seriesId, blogSeries.id))
      .where(eq(blogPostSeries.postId, post.id)),
  ])

  return { post, postSeries, postTags }
}
