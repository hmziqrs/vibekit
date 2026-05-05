import { blogPost, blogPostSlugHistory } from '$lib/server/db/schema'
import { renderAndSanitize } from '$lib/server/markdown'
import { redirect } from '@sveltejs/kit'
import { and, eq, isNull } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })
  const { db } = locals.services
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
