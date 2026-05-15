import { notification, notificationPreference } from '$lib/server/db/schema'
import { createLogger } from '$lib/server/logger'
import type { DrizzleDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, eq, inArray } from 'drizzle-orm'

import { dispatchToIntegrations } from './integrations/dispatch'
import { sendPushNotification } from './push'

const logger = createLogger('notifications')

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

function sanitizeLink(link: string | undefined): string | null {
  if (!link) return null
  const safe = link.startsWith('/') && !link.startsWith('//')
  return safe ? link : null
}

export async function createNotification(
  db: DrizzleDb,
  input: CreateNotificationInput
): Promise<void> {
  const enabled = await isInAppEnabled(db, input.userId, input.entityType ?? 'general')
  if (!enabled) return

  const safeLink = sanitizeLink(input.link)
  await db.insert(notification).values({
    body: input.body ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    id: uuid(),
    link: safeLink,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    title: input.title,
    type: input.type ?? 'info',
    userId: input.userId,
  })

  // Forward to connected Slack/Discord integrations (fire-and-forget)
  dispatchToIntegrations(db, input.userId, {
    body: input.body,
    link: safeLink ?? undefined,
    title: input.title,
    type: input.type,
  }).catch((error) => logger.error('Integration dispatch failed', { error, userId: input.userId }))

  // Send push notification if user has push enabled
  const pushEnabled = await isPushEnabled(db, input.userId, input.entityType ?? 'general')
  if (pushEnabled) {
    sendPushNotification(db, input.userId, {
      body: input.body,
      data: input.link ? { link: input.link } : undefined,
      title: input.title,
    }).catch((error) => logger.error('Push notification failed', { error, userId: input.userId }))
  }
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

  // Audit log the broadcast
  const { writeAuditLog } = await import('./audit')
  await writeAuditLog(db, {
    action: 'notification.broadcast',
    entityType: 'notification',
    metadata: {
      link: input.link,
      target: input.target,
      title: input.title,
      totalSent: filteredIds.length,
    },
    userId: 'system',
  }).catch(() => {})

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

export async function isEmailEnabled(
  db: DrizzleDb,
  userId: string,
  type: string
): Promise<boolean> {
  const pref = await db
    .select({ enabled: notificationPreference.enabled })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.userId, userId),
        eq(notificationPreference.type, type),
        eq(notificationPreference.channel, 'email')
      )
    )
    .get()
  return pref?.enabled ?? true
}

async function isPushEnabled(db: DrizzleDb, userId: string, type: string): Promise<boolean> {
  const pref = await db
    .select({ enabled: notificationPreference.enabled })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.userId, userId),
        eq(notificationPreference.type, type),
        eq(notificationPreference.channel, 'push')
      )
    )
    .get()
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
  input: {
    channel: 'email' | 'in_app' | 'push'
    enabled: boolean
    type: string
    userId: string
  }
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
