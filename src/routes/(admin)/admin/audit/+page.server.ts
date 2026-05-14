import { auditLog, user } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { desc, eq, like } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const db = locals.services.db as DrizzleDb
  const action = url.searchParams.get('action')
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = 50
  const offset = (page - 1) * limit

  const actionFilter = action ? like(auditLog.action, `%${action}%`) : undefined

  const logs = await db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      entityId: auditLog.entityId,
      entityType: auditLog.entityType,
      id: auditLog.id,
      metadata: auditLog.metadata,
      userEmail: user.email,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.userId, user.id))
    .where(actionFilter)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset)

  const totalRows = await db.select().from(auditLog).where(actionFilter)

  const totalPages = Math.ceil(totalRows.length / limit)

  return { logs, page, totalPages }
}
