import { notification } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'

type NotificationType = 'error' | 'info' | 'success' | 'warning'

interface CreateNotificationInput {
  body?: string
  entityId?: string
  entityType?: string
  metadata?: Record<string, unknown>
  title: string
  type?: NotificationType
  userId: string
}

export async function createNotification(db: AppDb, input: CreateNotificationInput) {
  await db.insert(notification).values({
    body: input.body ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    id: uuid(),
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    title: input.title,
    type: input.type ?? 'info',
    userId: input.userId,
  })
}
