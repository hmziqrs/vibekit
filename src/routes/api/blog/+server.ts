import { purgeBlogCache } from '$lib/server/cache'
import { getDb } from '$lib/server/db'
import { blogPost } from '$lib/server/db/schema'
import { rateLimit } from '$lib/server/rate-limit'
import { uuid } from '$lib/server/uuid'
import { createPostSchema } from '$lib/validators/blog'
import { json } from '@sveltejs/kit'
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'

import type { RequestHandler } from './$types'

/** Coalesce undefined/null to null for nullable DB columns. */
const toNullable = (v: string | undefined | null) => v ?? null

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
  let whereClause: ReturnType<typeof isNull>
  if (isTrash) {
    whereClause = isNotNull(blogPost.deletedAt)
  } else if (filterStatus) {
    whereClause = and(eq(blogPost.status, filterStatus), isNull(blogPost.deletedAt))!
  } else {
    whereClause = isNull(blogPost.deletedAt)
  }

  const posts = await db
    .select({
      createdAt: blogPost.createdAt,
      deletedAt: blogPost.deletedAt,
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      status: blogPost.status,
      title: blogPost.title,
      updatedAt: blogPost.updatedAt,
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

  const { allowed } = rateLimit(`blog-mutate:${locals.user.id}`)
  if (!allowed) {
    return json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) {
    return json({ details: parsed.error.issues, error: 'Validation failed' }, { status: 400 })
  }
  const db = getDb(platform!.env.DB)
  const existing = await db
    .select({ id: blogPost.id })
    .from(blogPost)
    .where(eq(blogPost.slug, parsed.data.slug))
    .get()
  if (existing) {
    return json({ error: 'Slug already exists' }, { status: 409 })
  }

  const id = uuid()
  const { title, slug, excerpt, contentBody, coverImageUrl, seoTitle, seoDescription, status } =
    parsed.data
  await db.insert(blogPost).values({
    authorId: locals.user.id,
    contentBody: toNullable(contentBody),
    coverImageUrl: toNullable(coverImageUrl),
    excerpt: toNullable(excerpt),
    id,
    publishedAt: status === 'published' ? new Date() : null,
    seoDescription: toNullable(seoDescription),
    seoTitle: toNullable(seoTitle),
    slug,
    status,
    title,
  })

  if (status === 'published') {
    await purgeBlogCache(platform, slug)
  }

  return json({ id }, { status: 201 })
}
