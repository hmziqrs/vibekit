import { renderAndSanitize } from '$lib/markdown'
import { user } from '$lib/server/db/auth.schema'
import {
  blogPost,
  blogPostSeries,
  blogPostSlugHistory,
  blogPostTag,
  blogSeries,
  blogTag,
} from '$lib/server/db/schema'
import { redirect } from '@sveltejs/kit'
import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'

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

    const tags = await db
      .select({ name: blogTag.name, slug: blogTag.slug })
      .from(blogPostTag)
      .innerJoin(blogTag, eq(blogPostTag.tagId, blogTag.id))
      .where(eq(blogPostTag.postId, post.post.id))
      .orderBy(blogTag.name)

    // Find related posts by tag overlap
    const tagIds = await db
      .select({ tagId: blogPostTag.tagId })
      .from(blogPostTag)
      .where(eq(blogPostTag.postId, post.post.id))

    let relatedPosts: Array<{
      coverImageUrl: string | null
      excerpt: string | null
      publishedAt: number | null
      slug: string
      title: string
    }> = []

    if (tagIds.length > 0) {
      const ids = tagIds.map((t) => t.tagId)
      relatedPosts = await db
        .select({
          coverImageUrl: blogPost.coverImageUrl,
          excerpt: blogPost.excerpt,
          publishedAt: blogPost.publishedAt,
          slug: blogPost.slug,
          title: blogPost.title,
        })
        .from(blogPost)
        .innerJoin(blogPostTag, eq(blogPost.id, blogPostTag.postId))
        .where(
          and(
            eq(blogPost.status, 'published'),
            isNull(blogPost.deletedAt),
            ne(blogPost.id, post.post.id),
            inArray(blogPostTag.tagId, ids)
          )
        )
        .groupBy(blogPost.id)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(3)
    }

    // Fetch series this post belongs to, with all posts in each series
    const postSeriesRows = await db
      .select({
        series: blogSeries,
      })
      .from(blogPostSeries)
      .innerJoin(blogSeries, eq(blogPostSeries.seriesId, blogSeries.id))
      .where(eq(blogPostSeries.postId, post.post.id))

    type SeriesEntry = {
      description: string | null
      id: string
      name: string
      posts: Array<{ isActive: boolean; slug: string; sortOrder: number; title: string }>
      slug: string
    }

    const series: SeriesEntry[] = []

    for (const row of postSeriesRows) {
      const seriesPosts = await db
        .select({
          slug: blogPost.slug,
          sortOrder: blogPostSeries.sortOrder,
          title: blogPost.title,
        })
        .from(blogPostSeries)
        .innerJoin(blogPost, eq(blogPostSeries.postId, blogPost.id))
        .where(and(eq(blogPostSeries.seriesId, row.series.id), eq(blogPost.status, 'published')))
        .orderBy(asc(blogPostSeries.sortOrder))

      series.push({
        description: row.series.description,
        id: row.series.id,
        name: row.series.name,
        posts: seriesPosts.map((p) => ({
          isActive: p.slug === post.post.slug,
          slug: p.slug,
          sortOrder: p.sortOrder,
          title: p.title,
        })),
        slug: row.series.slug,
      })
    }

    return {
      post: {
        ...post.post,
        authorImage: post.authorImage,
        authorName: post.authorName,
        contentHtml,
        readingTime,
        tags,
      },
      relatedPosts,
      series,
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
