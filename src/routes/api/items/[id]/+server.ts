import { getDb } from '$lib/server/db'
import { item } from '$lib/server/db/schema'
import { updateItemSchema } from '$lib/validators/item'
import { json } from '@sveltejs/kit'
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm'

import type { RequestHandler } from './$types'

const findItem = async (db: ReturnType<typeof getDb>, id: string, userId: string) =>
  db
    .select()
    .from(item)
    .where(and(eq(item.id, id), eq(item.userId, userId), isNull(item.deletedAt)))
    .get()

export const GET: RequestHandler = async ({ locals, params, platform }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const found = await findItem(getDb(platform!.env.DB), params.id, locals.user.id)
  if (!found) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  return json({
    item: {
      createdAt: found.createdAt,
      description: found.description,
      id: found.id,
      name: found.name,
      status: found.status,
      updatedAt: found.updatedAt,
    },
  })
}

export const PATCH: RequestHandler = async ({ locals, params, request, platform }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateItemSchema.safeParse(body)
  if (!parsed.success) {
    return json({ details: parsed.error.issues, error: 'Validation failed' }, { status: 400 })
  }

  const db = getDb(platform!.env.DB)
  const existing = await findItem(db, params.id, locals.user.id)
  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  type ItemUpdate = Partial<Pick<typeof item.$inferInsert, 'name' | 'description' | 'status'>> & {
    updatedAt: SQL
  }
  const updates: ItemUpdate = {
    updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
  }

  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description ?? null
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status
  }

  await db.update(item).set(updates).where(eq(item.id, params.id))

  const updated = await findItem(db, params.id, locals.user.id)
  return json({
    item: {
      createdAt: updated!.createdAt,
      description: updated!.description,
      id: updated!.id,
      name: updated!.name,
      status: updated!.status,
      updatedAt: updated!.updatedAt,
    },
  })
}

export const DELETE: RequestHandler = async ({ locals, params, platform }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb(platform!.env.DB)
  const existing = await findItem(db, params.id, locals.user.id)
  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(item)
    .set({
      deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
    })
    .where(eq(item.id, params.id))

  return new Response(null, { status: 204 })
}
