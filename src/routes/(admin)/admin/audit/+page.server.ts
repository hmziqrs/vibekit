import { getDb } from '$lib/server/db'
import { auditLog, user } from '$lib/server/db/schema'
import { desc, eq, count } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = getDb(platform!.env.DB)
  const action = url.searchParams.get('action')
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = 50
  const offset = (page - 1) * limit

  const logs = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      userEmail: user.email,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.userId, user.id))
    .where(action ? eq(auditLog.action, action) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({ count: count() })
    .from(auditLog)
    .where(action ? eq(auditLog.action, action) : undefined)

  const totalPages = Math.ceil((totalResult?.count ?? 0) / limit)

  return { logs, page, totalPages }
}
