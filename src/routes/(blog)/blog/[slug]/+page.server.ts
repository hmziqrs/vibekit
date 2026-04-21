import { getDb } from '$lib/server/db'
import { blogPost, blogPostSlugHistory } from '$lib/server/db/schema'
import { renderAndSanitize } from '$lib/server/markdown'
import { redirect } from '@sveltejs/kit'
import { eq, isNull, and } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = getDb(platform!.env.DB)
  const { slug } = params

  // Try to find published, non-deleted post by slug
  const post = await db
    .select()
    .from(blogPost)
    .where(
      and(eq(blogPost.slug, slug), eq(blogPost.status, 'published'), isNull(blogPost.deletedAt))
    )
    .get()

  if (post) {
    return {
      post: {
        ...post,
        contentHtml: post.contentBody ? renderAndSanitize(post.contentBody) : '',
      },
    }
  }

  // Slug history fallback — 301 redirect
  const historyEntry = await db
    .select({ postId: blogPostSlugHistory.postId })
    .from(blogPostSlugHistory)
    .where(eq(blogPostSlugHistory.oldSlug, slug))
    .get()

  if (historyEntry) {
    const currentPost = await db
      .select({ slug: blogPost.slug })
      .from(blogPost)
      .where(and(eq(blogPost.id, historyEntry.postId), isNull(blogPost.deletedAt)))
      .get()

    if (currentPost) {
      throw redirect(301, `/blog/${currentPost.slug}`)
    }
  }

  throw redirect(302, '/blog')
}
