import { getDb } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { blogPost, item } from '$lib/server/db/schema'
import { json } from '@sveltejs/kit'
import { and, isNotNull, lt } from 'drizzle-orm'

import type { RequestHandler } from './$types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  const cronSecret = request.headers.get('x-cron-secret')
  const isCron = cronSecret && cronSecret === platform!.env.CRON_SECRET

  if (!isCron && (!locals.user || locals.user.role !== 'admin')) {
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

  const deletedUsers = await db
    .delete(user)
    .where(and(isNotNull(user.deletedAt), lt(user.deletedAt, cutoff)))
    .returning({ id: user.id })

  return json({
    cutoff: cutoff.toISOString(),
    purged: { items: deletedItems.length, posts: deletedPosts.length, users: deletedUsers.length },
  })
}
