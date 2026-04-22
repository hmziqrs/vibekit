import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'
import { getDb } from '$lib/server/db'
import { user } from '$lib/server/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { writeAuditLog } from '$lib/server/audit'
import { rateLimit } from '$lib/server/rate-limit'

const updateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  displayName: z.string().max(100).optional(),
})

export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: locals.user ? 403 : 401 })
  }

  const { allowed } = rateLimit(`users-mutate:${locals.user.id}`)
  if (!allowed) {
    return json({ error: 'Too many requests' }, { status: 429 })
  }

  const targetId = params.id
  if (!targetId) {
    return json({ error: 'User ID required' }, { status: 400 })
  }

  const db = getDb(platform!.env.DB)

  const [existing] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!existing) {
    return json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  const auditMetadata: Record<string, unknown> = {}

  if (parsed.data.role !== undefined && parsed.data.role !== existing.role) {
    updates.role = parsed.data.role
    auditMetadata.oldRole = existing.role
    auditMetadata.newRole = parsed.data.role
  }

  if (parsed.data.status !== undefined && parsed.data.status !== existing.status) {
    updates.status = parsed.data.status
    auditMetadata.oldStatus = existing.status
    auditMetadata.newStatus = parsed.data.status
  }

  if (parsed.data.displayName !== undefined) {
    updates.displayName = parsed.data.displayName
    auditMetadata.oldDisplayName = existing.displayName
    auditMetadata.newDisplayName = parsed.data.displayName
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: 'No changes provided' }, { status: 400 })
  }

  updates.updatedAt = sql`(cast(unixepoch('subsecond') * 1000 as integer))`

  const [updated] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, targetId))
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      image: user.image,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })

  await writeAuditLog(platform!.env.DB, {
    action: 'user.update',
    entityType: 'user',
    entityId: targetId,
    userId: locals.user.id,
    metadata: auditMetadata,
  })

  return json({ user: updated })
}

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: locals.user ? 403 : 401 })
  }

  const { allowed } = rateLimit(`users-mutate:${locals.user.id}`)
  if (!allowed) {
    return json({ error: 'Too many requests' }, { status: 429 })
  }

  const targetId = params.id
  if (!targetId) {
    return json({ error: 'User ID required' }, { status: 400 })
  }

  if (targetId === locals.user.id) {
    return json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const db = getDb(platform!.env.DB)

  const [existing] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!existing) {
    return json({ error: 'User not found' }, { status: 404 })
  }

  await db
    .update(user)
    .set({ deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))` })
    .where(eq(user.id, targetId))

  await writeAuditLog(platform!.env.DB, {
    action: 'user.delete',
    entityType: 'user',
    entityId: targetId,
    userId: locals.user.id,
    metadata: { deletedUserName: existing.name, deletedUserEmail: existing.email },
  })

  return new Response(null, { status: 204 })
}
