import { notification, notificationPreference } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, eq, inArray } from 'drizzle-orm'

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

export async function createNotification(
  db: DrizzleDb,
  input: CreateNotificationInput
): Promise<void> {
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
  db: DrizzleDb,
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
  if (userIds.length === 0) return 0

  // Bulk preference check — single query instead of N+1
  const prefs = await db
    .select({ enabled: notificationPreference.enabled, userId: notificationPreference.userId })
    .from(notificationPreference)
    .where(
      and(
        inArray(notificationPreference.userId, userIds),
        eq(notificationPreference.type, 'broadcast'),
        eq(notificationPreference.channel, 'in_app')
      )
    )

  const disabledUserIds = new Set(prefs.filter((p) => !p.enabled).map((p) => p.userId))
  const filteredIds = userIds.filter((uid) => !disabledUserIds.has(uid))

  const values = filteredIds.map((userId) => ({
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
    // oxlint-disable-next-line no-await-in-loop
    await db.insert(notification).values(values.slice(i, i + 100))
  }

  return filteredIds.length
}

async function isInAppEnabled(db: DrizzleDb, userId: string, type: string): Promise<boolean> {
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
  db: DrizzleDb,
  userId: string
): Promise<{ channel: string; enabled: boolean; type: string }[]> {
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
  db: DrizzleDb,
  input: { channel: 'email' | 'in_app'; enabled: boolean; type: string; userId: string }
): Promise<void> {
  await db
    .insert(notificationPreference)
    .values({
      channel: input.channel,
      enabled: input.enabled,
      id: uuid(),
      type: input.type,
      userId: input.userId,
    })
    .onConflictDoUpdate({
      set: { enabled: input.enabled },
      target: [
        notificationPreference.userId,
        notificationPreference.type,
        notificationPreference.channel,
      ],
    })
}
