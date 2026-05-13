import { webhookDelivery, webhookEndpoint } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, sql } from 'drizzle-orm'

const MAX_RETRIES = 5
const BACKOFF_BASE_MS = 1000

function generateSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `whsec_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

async function hmacSign(payload: string, secret: string, timestamp: number): Promise<string> {
  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret.replace('whsec_', ''))
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getBackoffDelay(attemptCount: number): number {
  return Math.min(BACKOFF_BASE_MS * 5 ** attemptCount, 60_000)
}

export interface WebhookPayload {
  data: Record<string, unknown>
  eventType: string
  occurredAt: number
  webhookId: string
}

export async function createWebhookEndpoint(
  db: AppDb,
  userId: string,
  input: { description?: string; events: string[]; url: string }
) {
  const id = uuid()
  const secret = generateSecret()

  await db.insert(webhookEndpoint).values({
    active: true,
    createdAt: new Date(),
    description: input.description ?? null,
    events: input.events,
    id,
    secret,
    updatedAt: new Date(),
    url: input.url,
    userId,
  })

  return { id, secret, url: input.url }
}

export async function listWebhookEndpoints(db: AppDb, userId: string) {
  return db
    .select()
    .from(webhookEndpoint)
    .where(eq(webhookEndpoint.userId, userId))
    .orderBy(desc(webhookEndpoint.createdAt))
}

export async function updateWebhookEndpoint(
  db: AppDb,
  endpointId: string,
  userId: string,
  input: { active?: boolean; description?: string; events?: string[]; url?: string }
) {
  const rows = await db
    .select()
    .from(webhookEndpoint)
    .where(and(eq(webhookEndpoint.id, endpointId), eq(webhookEndpoint.userId, userId)))

  const existing = rows[0] as { id: string } | undefined
  if (!existing) return null

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.url !== undefined) updates.url = input.url
  if (input.events !== undefined) updates.events = input.events
  if (input.description !== undefined) updates.description = input.description
  if (input.active !== undefined) updates.active = input.active

  await db.update(webhookEndpoint).set(updates).where(eq(webhookEndpoint.id, endpointId))

  return { id: endpointId }
}

export async function deleteWebhookEndpoint(db: AppDb, endpointId: string, userId: string) {
  await db
    .delete(webhookEndpoint)
    .where(and(eq(webhookEndpoint.id, endpointId), eq(webhookEndpoint.userId, userId)))
}

export async function getWebhookEndpoint(db: AppDb, endpointId: string, userId: string) {
  const rows = await db
    .select()
    .from(webhookEndpoint)
    .where(and(eq(webhookEndpoint.id, endpointId), eq(webhookEndpoint.userId, userId)))

  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function deliverWebhook(
  db: AppDb,
  endpoint: { id: string; secret: string; url: string },
  eventType: string,
  data: Record<string, unknown>
) {
  const id = uuid()
  const occurredAt = Date.now()
  const payload: WebhookPayload = {
    data,
    eventType,
    occurredAt,
    webhookId: id,
  }
  const payloadStr = JSON.stringify(payload)
  const signature = await hmacSign(payloadStr, endpoint.secret, occurredAt)

  // Create delivery record as pending

  await db.insert(webhookDelivery).values({
    attemptCount: 0,
    createdAt: new Date(),
    endpointId: endpoint.id,
    eventType,
    id,
    nextRetryAt: null,
    payload,
    responseBody: null,
    status: 'pending',
    statusCode: null,
    updatedAt: new Date(),
  })

  // Attempt delivery
  try {
    const response = await fetch(endpoint.url, {
      body: payloadStr,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-ID': id,
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Timestamp': String(occurredAt),
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    const responseBody = await response.text().catch(() => '')

    if (response.ok) {
      await db
        .update(webhookDelivery)
        .set({
          attemptCount: sql`${webhookDelivery.attemptCount} + 1`,
          responseBody: responseBody.slice(0, 10_000),
          status: 'success',
          statusCode: response.status,
          updatedAt: new Date(),
        })
        .where(eq(webhookDelivery.id, id))
      return { id, status: 'success' as const }
    }

    // Non-2xx — schedule retry
    const attemptCount = 1
    const shouldRetry = attemptCount < MAX_RETRIES

    await db
      .update(webhookDelivery)
      .set({
        attemptCount: sql`${webhookDelivery.attemptCount} + 1`,
        nextRetryAt: shouldRetry ? new Date(Date.now() + getBackoffDelay(attemptCount)) : null,
        responseBody: responseBody.slice(0, 10_000),
        status: shouldRetry ? 'retrying' : 'failed',
        statusCode: response.status,
        updatedAt: new Date(),
      })
      .where(eq(webhookDelivery.id, id))

    return { id, status: shouldRetry ? ('retrying' as const) : ('failed' as const) }
  } catch (error) {
    console.error(`Webhook delivery ${id} failed:`, error)
    const attemptCount = 1
    const shouldRetry = attemptCount < MAX_RETRIES

    await db
      .update(webhookDelivery)
      .set({
        attemptCount: sql`${webhookDelivery.attemptCount} + 1`,
        nextRetryAt: shouldRetry ? new Date(Date.now() + getBackoffDelay(attemptCount)) : null,
        status: shouldRetry ? 'retrying' : 'failed',
        updatedAt: new Date(),
      })
      .where(eq(webhookDelivery.id, id))

    return { id, status: shouldRetry ? ('retrying' as const) : ('failed' as const) }
  }
}

export async function dispatchWebhooksForEvent(
  db: AppDb,
  eventType: string,
  data: Record<string, unknown>
) {
  // Find all active endpoints subscribed to this event type (or with wildcard '*')
  const endpoints = await db.select().from(webhookEndpoint).where(eq(webhookEndpoint.active, true))

  const matching = (
    endpoints as { events: string[]; id: string; secret: string; url: string }[]
  ).filter((ep) => ep.events.includes('*') || ep.events.includes(eventType))

  // Fire deliveries in parallel (fire and forget for each)
  const results = await Promise.allSettled(
    matching.map((ep) =>
      deliverWebhook(db, { id: ep.id, secret: ep.secret, url: ep.url }, eventType, data)
    )
  )

  return results.length
}

export async function retryWebhookDelivery(db: AppDb, deliveryId: string) {
  const rows = await db.select().from(webhookDelivery).where(eq(webhookDelivery.id, deliveryId))

  const delivery = rows[0] as
    | {
        attemptCount: number
        endpointId: string
        eventType: string
        id: string
        payload: Record<string, unknown>
        status: string
      }
    | undefined

  if (!delivery || delivery.status === 'success') return null

  const endpointRows = await db
    .select()
    .from(webhookEndpoint)
    .where(eq(webhookEndpoint.id, delivery.endpointId))

  const endpoint = endpointRows[0] as { id: string; secret: string; url: string } | undefined
  if (!endpoint) return null

  const attemptCount = delivery.attemptCount + 1
  const shouldRetry = attemptCount < MAX_RETRIES
  const payloadStr = JSON.stringify(delivery.payload)
  const occurredAt = Date.now()
  const signature = await hmacSign(payloadStr, endpoint.secret, occurredAt)

  try {
    const response = await fetch(endpoint.url, {
      body: payloadStr,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-ID': delivery.id,
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Timestamp': String(occurredAt),
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    const responseBody = await response.text().catch(() => '')

    await db
      .update(webhookDelivery)
      .set({
        attemptCount,
        nextRetryAt: null,
        responseBody: responseBody.slice(0, 10_000),
        status: response.ok ? 'success' : shouldRetry ? 'retrying' : 'failed',
        statusCode: response.status,
        updatedAt: new Date(),
      })
      .where(eq(webhookDelivery.id, deliveryId))

    if (!response.ok && shouldRetry) {
      await db
        .update(webhookDelivery)
        .set({
          nextRetryAt: new Date(Date.now() + getBackoffDelay(attemptCount)),
        })
        .where(eq(webhookDelivery.id, deliveryId))
    }

    return { id: deliveryId, status: response.ok ? 'success' : shouldRetry ? 'retrying' : 'failed' }
  } catch (error) {
    console.error(`Webhook delivery ${deliveryId} retry failed:`, error)
    await db
      .update(webhookDelivery)
      .set({
        attemptCount,
        nextRetryAt: shouldRetry ? new Date(Date.now() + getBackoffDelay(attemptCount)) : null,
        status: shouldRetry ? 'retrying' : 'failed',
        updatedAt: new Date(),
      })
      .where(eq(webhookDelivery.id, deliveryId))

    return { id: deliveryId, status: shouldRetry ? 'retrying' : 'failed' }
  }
}

export async function listWebhookDeliveries(db: AppDb, endpointId: string, limit = 50) {
  return db
    .select()
    .from(webhookDelivery)
    .where(eq(webhookDelivery.endpointId, endpointId))
    .orderBy(desc(webhookDelivery.createdAt))
    .limit(limit)
}

export async function listAllDeliveries(
  db: AppDb,
  options?: { eventType?: string; limit?: number; status?: string }
) {
  const limit = options?.limit ?? 50
  let query = db.select().from(webhookDelivery)

  const conditions = []
  if (options?.eventType) {
    conditions.push(eq(webhookDelivery.eventType, options.eventType))
  }
  if (options?.status) {
    conditions.push(eq(webhookDelivery.status, options.status))
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions))
    return query.orderBy(desc(webhookDelivery.createdAt)).limit(limit)
  }

  return query.orderBy(desc(webhookDelivery.createdAt)).limit(limit)
}

export async function sendTestWebhook(
  db: AppDb,
  endpoint: { id: string; secret: string; url: string }
) {
  return deliverWebhook(db, endpoint, 'webhook.test', {
    message: 'Test webhook from Vibekit',
    timestamp: new Date().toISOString(),
  })
}

export { generateSecret, hmacSign }
