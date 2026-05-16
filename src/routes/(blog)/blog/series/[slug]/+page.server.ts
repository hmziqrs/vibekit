import type { getDb } from '$lib/server/db'
import { blogPost, blogPostSeries, blogSeries } from '$lib/server/db/schema'
import { redirect } from '@sveltejs/kit'
import { and, asc, eq, isNull } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

// Narrow AppDb union to a single type so .select() overload resolution works.
type Db = ReturnType<typeof getDb>

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
  setHeaders({
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60',
  })
  const db = locals.services.db as Db
  const { slug } = params

  const seriesRows = await db.select().from(blogSeries).where(eq(blogSeries.slug, slug)).limit(1)

  const [series] = seriesRows
  if (!series) {
    throw redirect(302, '/blog')
  }

  const rows = await db
    .select({
      coverImageUrl: blogPost.coverImageUrl,
      excerpt: blogPost.excerpt,
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      sortOrder: blogPostSeries.sortOrder,
      title: blogPost.title,
    })
    .from(blogPostSeries)
    .innerJoin(blogPost, eq(blogPostSeries.postId, blogPost.id))
    .where(
      and(
        eq(blogPostSeries.seriesId, series.id),
        eq(blogPost.status, 'published'),
        isNull(blogPost.deletedAt)
      )
    )
    .orderBy(asc(blogPostSeries.sortOrder))

  const posts = rows as unknown as {
    coverImageUrl: string | null
    excerpt: string | null
    id: string
    publishedAt: number | null
    slug: string
    sortOrder: number
    title: string
  }[]

  return {
    posts,
    series: {
      coverImageUrl: series.coverImageUrl,
      description: series.description,
      id: series.id,
      name: series.name,
      slug: series.slug,
    },
  }
}
