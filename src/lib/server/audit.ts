import { getDb } from './db'
import { auditLog } from './db/schema'

export async function writeAuditLog(
  d1: D1Database,
  entry: {
    action: string
    entityType: string
    entityId: string
    userId: string
    metadata?: Record<string, unknown>
  },
) {
  const db = getDb(d1)
  await db.insert(auditLog).values({
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    userId: entry.userId,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
  })
}
