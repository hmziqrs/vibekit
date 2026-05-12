import { renderAndSanitize } from '$lib/markdown'
import { user } from '$lib/server/db/auth.schema'
import { blogPost, blogPostSlugHistory, blogPostTag, blogTag } from '$lib/server/db/schema'
import { redirect } from '@sveltejs/kit'
import { and, eq, isNull } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })
  const { db } = locals.services
  const { slug } = params

  // Try to find published, non-deleted post by slug with author
  const [post] = await db
    .select({
      authorImage: user.image,
      authorName: user.displayName,
      post: blogPost,
    })
    .from(blogPost)
    .leftJoin(user, eq(blogPost.authorId, user.id))
    .where(
      and(eq(blogPost.slug, slug), eq(blogPost.status, 'published'), isNull(blogPost.deletedAt))
    )
    .limit(1)

  if (post) {
    const contentHtml = post.post.contentBody ? renderAndSanitize(post.post.contentBody) : ''
    const readingTime = estimateReadingTime(contentHtml)

    // Fetch tags for this post
    const tags = await db
      .select({ name: blogTag.name, slug: blogTag.slug })
      .from(blogPostTag)
      .innerJoin(blogTag, eq(blogPostTag.tagId, blogTag.id))
      .where(eq(blogPostTag.postId, post.post.id))
      .orderBy(blogTag.name)

    return {
      post: {
        ...post.post,
        authorImage: post.authorImage,
        authorName: post.authorName,
        contentHtml,
        readingTime,
        tags,
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
