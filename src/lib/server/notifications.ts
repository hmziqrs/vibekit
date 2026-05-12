import { notification, notificationPreference } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, eq } from 'drizzle-orm'

type NotificationType = 'error' | 'info' | 'success' | 'warning'

interface CreateNotificationInput {
  body?: string
  entityId?: string
  entityType?: string
  link?: string
  metadata?: Record<string, unknown>
  title: string
  type?: NotificationType
  userId: string
}

export async function createNotification(db: AppDb, input: CreateNotificationInput): Promise<void> {
  const enabled = await isInAppEnabled(db, input.userId, input.entityType ?? 'general')
  if (!enabled) return

  await db.insert(notification).values({
    body: input.body ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    id: uuid(),
    link: input.link ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    title: input.title,
    type: input.type ?? 'info',
    userId: input.userId,
  })
}

export async function createBroadcast(
  db: AppDb,
  input: {
    body?: string
    link?: string
    target: 'admins' | 'all'
    title: string
    type?: NotificationType
  },
  getUserIds: (target: 'admins' | 'all') => Promise<string[]>
): Promise<number> {
  const userIds = await getUserIds(input.target)
  const values = userIds.map((userId) => ({
    body: input.body ?? null,
    entityId: null,
    entityType: 'broadcast',
    id: uuid(),
    link: input.link ?? null,
    metadata: null,
    readAt: null,
    title: input.title,
    type: input.type ?? 'info',
    userId,
  }))

  // Insert in batches of 100
  for (let i = 0; i < values.length; i += 100) {
    await db.insert(notification).values(values.slice(i, i + 100))
  }

  return userIds.length
}

async function isInAppEnabled(db: AppDb, userId: string, type: string): Promise<boolean> {
  const pref = await db
    .select({ enabled: notificationPreference.enabled })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.userId, userId),
        eq(notificationPreference.type, type),
        eq(notificationPreference.channel, 'in_app')
      )
    )
    .get()
  // Default to enabled if no preference set
  return pref?.enabled ?? true
}

export async function getNotificationPreferences(
  db: AppDb,
  userId: string
): Promise<Array<{ channel: string; enabled: boolean; type: string }>> {
  const prefs = await db
    .select({
      channel: notificationPreference.channel,
      enabled: notificationPreference.enabled,
      type: notificationPreference.type,
    })
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, userId))

  return prefs
}

export async function setNotificationPreference(
  db: AppDb,
  input: { channel: 'email' | 'in_app'; enabled: boolean; type: string; userId: string }
): Promise<void> {
  const existing = await db
    .select({ id: notificationPreference.id })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.userId, input.userId),
        eq(notificationPreference.type, input.type),
        eq(notificationPreference.channel, input.channel)
      )
    )
    .get()

  if (existing) {
    await db
      .update(notificationPreference)
      .set({ enabled: input.enabled })
      .where(eq(notificationPreference.id, existing.id))
  } else {
    await db.insert(notificationPreference).values({
      channel: input.channel,
      enabled: input.enabled,
      id: uuid(),
      type: input.type,
      userId: input.userId,
    })
  }
}
