import { getDb } from '$lib/server/db'
import { item } from '$lib/server/db/schema'
import { createItemSchema } from '$lib/validators/item'
import { json } from '@sveltejs/kit'
import { and, desc, isNull, like, eq } from 'drizzle-orm'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, url, platform }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb(platform!.env.DB)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')?.trim()

  const conditions = [eq(item.userId, locals.user.id), isNull(item.deletedAt)]

  if (status === 'active' || status === 'archived') {
    conditions.push(eq(item.status, status))
  }

  if (search) {
    conditions.push(like(item.name, `%${search}%`))
  }

  const items = await db
    .select({
      id: item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
    .from(item)
    .where(and(...conditions))
    .orderBy(desc(item.createdAt))

  return json({ items })
}

export const POST: RequestHandler = async ({ locals, request, platform }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createItemSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const db = getDb(platform!.env.DB)
  const created = await db
    .insert(item)
    .values({
      userId: locals.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning({
      id: item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
    .get()

  return json({ item: created }, { status: 201 })
}
