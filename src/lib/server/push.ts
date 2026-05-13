import { eq } from 'drizzle-orm'
import webpush from 'web-push'

import { pushSubscription } from './db/schema'
import type { AppDb } from './services/types'
import { uuid } from './uuid'

export function configureWebPush(
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export async function subscribeToPush(
  db: AppDb,
  input: {
    auth: string
    endpoint: string
    p256dh: string
    userAgent?: string
    userId: string
  }
) {
  // Remove existing subscription for this endpoint
  await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, input.endpoint))

  const id = uuid()
  await db.insert(pushSubscription).values({
    auth: input.auth,
    endpoint: input.endpoint,
    id,
    p256dh: input.p256dh,
    userAgent: input.userAgent ?? null,
    userId: input.userId,
  })

  return { id }
}

export async function unsubscribeFromPush(db: AppDb, endpoint: string) {
  await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint))
}

export async function getUserPushSubscriptions(db: AppDb, userId: string) {
  return db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId)).limit(50)
}

export async function sendPushNotification(
  db: AppDb,
  userId: string,
  payload: {
    body?: string
    data?: Record<string, unknown>
    icon?: string
    title: string
  }
) {
  const subs = await getUserPushSubscriptions(db, userId)
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.auth, p256dh: sub.p256dh },
        },
        JSON.stringify(payload)
      )
    )
  )

  // Remove invalid subscriptions (410 Gone or 404 Not Found)
  const invalidSubs = results
    .map((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason as { statusCode?: number }
        if (error.statusCode === 410 || error.statusCode === 404) {
          return subs[index]
        }
      }
      return null
    })
    .filter(Boolean)

  if (invalidSubs.length > 0) {
    await Promise.all(
      invalidSubs.map((sub) =>
        db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub!.endpoint))
      )
    )
  }

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    total: subs.length,
  }
}
