import { item } from '$lib/server/db/schema'
import { createItemSchema } from '$lib/validators/item'
import { json } from '@sveltejs/kit'
import { and, desc, eq, isNull, like } from 'drizzle-orm'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { db } = locals.services
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
      createdAt: item.createdAt,
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
      updatedAt: item.updatedAt,
    })
    .from(item)
    .where(and(...conditions))
    .orderBy(desc(item.createdAt))

  return json({ items })
}

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createItemSchema.safeParse(body)
  if (!parsed.success) {
    return json({ details: parsed.error.issues, error: 'Validation failed' }, { status: 400 })
  }

  const { db } = locals.services
  const created = await db
    .insert(item)
    .values({
      description: parsed.data.description ?? null,
      name: parsed.data.name,
      userId: locals.user.id,
    })
    .returning({
      createdAt: item.createdAt,
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
      updatedAt: item.updatedAt,
    })
    .get()

  return json({ item: created }, { status: 201 })
}
