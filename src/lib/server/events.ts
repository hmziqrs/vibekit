import { writeAuditLog } from '$lib/server/audit'
import { createLogger } from '$lib/server/logger'
import type { DrizzleDb } from '$lib/server/services/types'
import { dispatchWebhooksForEvent } from '$lib/server/webhooks'

const logger = createLogger('events')

export interface EmitEventInput {
  action: string
  entityId: string
  entityType: string
  metadata?: Record<string, unknown>
  userId: string
}

export async function emitEvent(db: DrizzleDb, input: EmitEventInput): Promise<void> {
  // Always write audit log
  await writeAuditLog(db, {
    action: input.action,
    entityId: input.entityId,
    entityType: input.entityType,
    metadata: input.metadata,
    userId: input.userId,
  })

  // Dispatch to webhook endpoints owned by this user (true fire-and-forget)
  dispatchWebhooksForEvent(
    db,
    input.action,
    {
      entityId: input.entityId,
      entityType: input.entityType,
      ...input.metadata,
    },
    input.userId
  ).catch((error) => {
    logger.error('Webhook dispatch failed', {
      action: input.action,
      entityId: input.entityId,
      error,
    })
  })
}
