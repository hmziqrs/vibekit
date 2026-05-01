import { getDb } from './db'
import { auditLog } from './db/schema'

export async function writeAuditLog(
  d1: D1Database,
  entry: {
    action: string
    entityType: string
    entityId: string
    userId: string
    metadata?: unknown
  }
) {
  const db = getDb(d1)
  await db.insert(auditLog).values({
    action: entry.action,
    entityId: entry.entityId,
    entityType: entry.entityType,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    userId: entry.userId,
  })
}
