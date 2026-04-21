import { getDb } from '$lib/server/db'
import { blogPost, blogPostSlugHistory } from '$lib/server/db/schema'
import { uuid } from '$lib/server/uuid'
import { updatePostSchema } from '$lib/validators/blog'
import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import type { RequestHandler } from './$types'

const findPost = async (db: ReturnType<typeof getDb>, id: string) =>
  db.select().from(blogPost).where(eq(blogPost.id, id)).get()

const postExists = async (db: ReturnType<typeof getDb>, id: string) =>
  db.select({ id: blogPost.id }).from(blogPost).where(eq(blogPost.id, id)).get()

export const GET: RequestHandler = async ({ locals, params, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  const post = await findPost(getDb(platform!.env.DB), params.id)
  if (!post) return json({ error: 'Not found' }, { status: 404 })
  return json({ post })
}

export const PATCH: RequestHandler = async ({ locals, params, request, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  const parsed = updatePostSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const db = getDb(platform!.env.DB)
  const existing = await findPost(db, params.id)
  if (!existing) return json({ error: 'Not found' }, { status: 404 })

  const data = parsed.data
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  const simpleFields = [
    'title',
    'excerpt',
    'contentBody',
    'coverImageUrl',
    'seoTitle',
    'seoDescription',
  ] as const

  for (const key of simpleFields) {
    if (data[key] !== undefined) updates[key] = data[key]
  }
  if (data.status !== undefined) updates.status = data.status

  if (data.slug !== undefined && data.slug !== existing.slug) {
    await db
      .insert(blogPostSlugHistory)
      .values({ id: uuid(), postId: params.id, oldSlug: existing.slug })
    updates.slug = data.slug
  }
  if (data.status === 'published' && !existing.publishedAt) updates.publishedAt = new Date()

  await db.update(blogPost).set(updates).where(eq(blogPost.id, params.id))
  return json({ success: true })
}

export const DELETE: RequestHandler = async ({ locals, params, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = getDb(platform!.env.DB)
  if (!(await postExists(db, params.id))) return json({ error: 'Not found' }, { status: 404 })

  await db
    .update(blogPost)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(blogPost.id, params.id))
  return json({ success: true })
}
