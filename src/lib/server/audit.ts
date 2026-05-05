import { auditLog } from './db/schema'
import type { AppDb } from './services/types'

export async function writeAuditLog(
  db: AppDb,
  entry: {
    action: string
    entityType: string
    entityId: string
    userId: string
    metadata?: unknown
  }
) {
  await db.insert(auditLog).values({
    action: entry.action,
    entityId: entry.entityId,
    entityType: entry.entityType,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    userId: entry.userId,
  })
}
