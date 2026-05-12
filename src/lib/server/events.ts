import { writeAuditLog } from '$lib/server/audit'
import { dispatchWebhooksForEvent } from '$lib/server/webhooks'

export interface EmitEventInput {
  action: string
  entityId: string
  entityType: string
  metadata?: Record<string, unknown>
  userId: string
}

export async function emitEvent(
  db: Parameters<typeof writeAuditLog>[0],
  input: EmitEventInput
): Promise<void> {
  // Always write audit log
  await writeAuditLog(db, {
    action: input.action,
    entityId: input.entityId,
    entityType: input.entityType,
    metadata: input.metadata,
    userId: input.userId,
  })

  // Dispatch to webhook endpoints (fire and forget, don't block the response)
  // Use try/catch to never fail the main operation if webhook dispatch fails
  try {
    await dispatchWebhooksForEvent(db, input.action, {
      entityId: input.entityId,
      entityType: input.entityType,
      ...input.metadata,
    })
  } catch (error) {
    // Webhook dispatch failure should never block the main operation
    console.error(
      JSON.stringify({
        action: input.action,
        entityId: input.entityId,
        error: error instanceof Error ? error.message : String(error),
        event: 'webhook.dispatch_failed',
      })
    )
  }
}
