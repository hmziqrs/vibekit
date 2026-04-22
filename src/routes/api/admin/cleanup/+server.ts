import { getDb } from '$lib/server/db'
import { blogPost, item } from '$lib/server/db/schema'
import { json } from '@sveltejs/kit'
import { and, isNotNull, lt, sql } from 'drizzle-orm'

import type { RequestHandler } from './$types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const POST: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb(platform!.env.DB)
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS)

  const deletedPosts = await db
    .delete(blogPost)
    .where(and(isNotNull(blogPost.deletedAt), lt(blogPost.deletedAt, cutoff)))
    .returning({ id: blogPost.id })

  const deletedItems = await db
    .delete(item)
    .where(and(isNotNull(item.deletedAt), lt(item.deletedAt, cutoff)))
    .returning({ id: item.id })

  return json({
    purged: { posts: deletedPosts.length, items: deletedItems.length },
    cutoff: cutoff.toISOString(),
  })
}
