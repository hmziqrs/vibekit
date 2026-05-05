import { blogPost } from '$lib/server/db/schema'
import { rateLimit } from '$lib/server/rate-limit'
import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed } = rateLimit(`blog-mutate:${locals.user.id}`)
  if (!allowed) {
    return json({ error: 'Too many requests' }, { status: 429 })
  }

  const { db } = locals.services
  const existing = await db
    .select({ id: blogPost.id, slug: blogPost.slug })
    .from(blogPost)
    .where(eq(blogPost.id, params.id))
    .get()
  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(blogPost)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(blogPost.id, params.id))

  await locals.services.cache.purgeBlog(existing.slug)

  return json({ success: true })
}
