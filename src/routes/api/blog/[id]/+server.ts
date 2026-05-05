import { blogPost, blogPostSlugHistory } from '$lib/server/db/schema'
import { rateLimit } from '$lib/server/rate-limit'
import type { AppDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { updatePostSchema } from '$lib/validators/blog'
import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import type { RequestHandler } from './$types'

const findPost = async (db: AppDb, id: string) =>
  db.select().from(blogPost).where(eq(blogPost.id, id)).get()

export const GET: RequestHandler = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  const post = await findPost(locals.services.db, params.id)
  if (!post) {
    return json({ error: 'Not found' }, { status: 404 })
  }
  return json({ post })
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed } = rateLimit(`blog-mutate:${locals.user.id}`)
  if (!allowed) {
    return json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const parsed = updatePostSchema.safeParse(body)
  if (!parsed.success) {
    return json({ details: parsed.error.issues, error: 'Validation failed' }, { status: 400 })
  }

  const { db } = locals.services
  const existing = await findPost(db, params.id)
  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  const { data } = parsed
  const updates: Partial<typeof blogPost.$inferInsert> = { updatedAt: new Date() }
  if (data.title !== undefined) {
    updates.title = data.title
  }
  if (data.excerpt !== undefined) {
    updates.excerpt = data.excerpt
  }
  if (data.contentBody !== undefined) {
    updates.contentBody = data.contentBody
  }
  if (data.coverImageUrl !== undefined) {
    updates.coverImageUrl = data.coverImageUrl
  }
  if (data.seoTitle !== undefined) {
    updates.seoTitle = data.seoTitle
  }
  if (data.seoDescription !== undefined) {
    updates.seoDescription = data.seoDescription
  }
  if (data.status !== undefined) {
    updates.status = data.status
  }

  if (data.slug !== undefined && data.slug !== existing.slug) {
    await db
      .insert(blogPostSlugHistory)
      .values({ id: uuid(), oldSlug: existing.slug, postId: params.id })
    updates.slug = data.slug
  }
  if (data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = new Date()
  }

  await db.update(blogPost).set(updates).where(eq(blogPost.id, params.id))

  if (existing.status === 'published' || updates.status === 'published') {
    await locals.services.cache.purgeBlog(updates.slug ?? existing.slug)
  }

  return json({ success: true })
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed } = rateLimit(`blog-mutate:${locals.user.id}`)
  if (!allowed) {
    return json({ error: 'Too many requests' }, { status: 429 })
  }

  const { db } = locals.services
  const existing = await findPost(db, params.id)
  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(blogPost)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(blogPost.id, params.id))

  await locals.services.cache.purgeBlog(existing.slug)

  return json({ success: true })
}
