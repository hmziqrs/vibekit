import { getDb } from '$lib/server/db'
import { blogPost } from '$lib/server/db/schema'
import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, params, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb(platform!.env.DB)
  const existing = await db
    .select({ id: blogPost.id })
    .from(blogPost)
    .where(eq(blogPost.id, params.id))
    .get()
  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(blogPost)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(blogPost.id, params.id))

  return json({ success: true })
}
