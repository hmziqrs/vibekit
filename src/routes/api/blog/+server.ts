import { purgeBlogCache } from '$lib/server/cache'
import { getDb } from '$lib/server/db'
import { blogPost } from '$lib/server/db/schema'
import { uuid } from '$lib/server/uuid'
import { createPostSchema } from '$lib/validators/blog'
import { json } from '@sveltejs/kit'
import { eq, desc, isNull, and, isNotNull } from 'drizzle-orm'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, url, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = getDb(platform!.env.DB)
  const rawStatus = url.searchParams.get('status') ?? ''
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = 20
  const offset = (page - 1) * limit
  const validStatuses = ['draft', 'published', 'archived'] as const
  const isTrash = rawStatus === 'trash'
  const filterStatus = validStatuses.includes(rawStatus as (typeof validStatuses)[number])
    ? (rawStatus as (typeof validStatuses)[number])
    : null
  const whereClause = isTrash
    ? isNotNull(blogPost.deletedAt)
    : filterStatus
      ? and(eq(blogPost.status, filterStatus), isNull(blogPost.deletedAt))
      : isNull(blogPost.deletedAt)

  const posts = await db
    .select({
      id: blogPost.id,
      title: blogPost.title,
      slug: blogPost.slug,
      status: blogPost.status,
      publishedAt: blogPost.publishedAt,
      createdAt: blogPost.createdAt,
      updatedAt: blogPost.updatedAt,
      deletedAt: blogPost.deletedAt,
    })
    .from(blogPost)
    .where(whereClause)
    .orderBy(desc(blogPost.createdAt))
    .limit(limit)
    .offset(offset)
  return json({ posts })
}

export const POST: RequestHandler = async ({ locals, request, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }
  const db = getDb(platform!.env.DB)
  const existing = await db
    .select({ id: blogPost.id })
    .from(blogPost)
    .where(eq(blogPost.slug, parsed.data.slug))
    .get()
  if (existing) return json({ error: 'Slug already exists' }, { status: 409 })

  const id = uuid()
  const { title, slug, excerpt, contentBody, coverImageUrl, seoTitle, seoDescription, status } =
    parsed.data
  const n = (v: string | undefined | null) => v ?? null
  await db.insert(blogPost).values({
    id,
    title,
    slug,
    excerpt: n(excerpt),
    contentBody: n(contentBody),
    coverImageUrl: n(coverImageUrl),
    seoTitle: n(seoTitle),
    seoDescription: n(seoDescription),
    status,
    authorId: locals.user.id,
    publishedAt: status === 'published' ? new Date() : null,
  })

  if (status === 'published') {
    await purgeBlogCache(platform, slug)
  }

  return json({ id }, { status: 201 })
}
