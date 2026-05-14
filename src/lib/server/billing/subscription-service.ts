import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

import {
  subscription,
  subscriptionEvent,
  subscriptionPlan,
  stripeWebhookEvent,
  usageRecord,
} from '../db/schema'
import type { AppDb } from '../services/types'
import { uuid } from '../uuid'

export async function getActivePlans(db: AppDb) {
  return db
    .select()
    .from(subscriptionPlan)
    .where(eq(subscriptionPlan.isActive, true))
    .orderBy(subscriptionPlan.sortOrder)
}

export async function getAllPlans(db: AppDb) {
  return db.select().from(subscriptionPlan).orderBy(subscriptionPlan.sortOrder)
}

export async function getPlanBySlug(db: AppDb, slug: string) {
  return db.select().from(subscriptionPlan).where(eq(subscriptionPlan.slug, slug)).get()
}

export async function getPlanById(db: AppDb, planId: string) {
  return db.select().from(subscriptionPlan).where(eq(subscriptionPlan.id, planId)).get()
}

export async function createPlan(
  db: AppDb,
  input: {
    currency?: string
    description?: string
    features?: string[]
    interval: 'month' | 'year'
    isActive?: boolean
    name: string
    priceInCents: number
    slug: string
    sortOrder?: number
    stripePriceId?: string
    trialDays?: number
  }
) {
  const id = uuid()
  await db.insert(subscriptionPlan).values({
    currency: input.currency ?? 'usd',
    description: input.description ?? null,
    features: input.features ? JSON.stringify(input.features) : null,
    id,
    interval: input.interval,
    isActive: input.isActive ?? true,
    name: input.name,
    priceInCents: input.priceInCents,
    slug: input.slug,
    sortOrder: input.sortOrder ?? 0,
    stripePriceId: input.stripePriceId ?? null,
    trialDays: input.trialDays ?? 0,
  })
  return getPlanById(db, id)
}

export async function updatePlan(db: AppDb, planId: string, input: Record<string, unknown>) {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.priceInCents !== undefined) updates.priceInCents = input.priceInCents
  if (input.interval !== undefined) updates.interval = input.interval
  if (input.trialDays !== undefined) updates.trialDays = input.trialDays
  if (input.features !== undefined) {
    updates.features = Array.isArray(input.features) ? JSON.stringify(input.features) : null
  }
  if (input.isActive !== undefined) updates.isActive = input.isActive
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder
  if (input.stripePriceId !== undefined) updates.stripePriceId = input.stripePriceId
  if (input.currency !== undefined) updates.currency = input.currency

  await db.update(subscriptionPlan).set(updates).where(eq(subscriptionPlan.id, planId))
  return getPlanById(db, planId)
}

export async function deactivatePlan(db: AppDb, planId: string) {
  await db.update(subscriptionPlan).set({ isActive: false }).where(eq(subscriptionPlan.id, planId))
}

export async function getUserSubscription(db: AppDb, userId: string) {
  return db
    .select()
    .from(subscription)
    .where(
      and(eq(subscription.userId, userId), sql`${subscription.status} IN ('active', 'trialing')`)
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1)
    .get()
}

export async function getOrgSubscription(db: AppDb, orgId: string) {
  return db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.organizationId, orgId),
        sql`${subscription.status} IN ('active', 'trialing')`
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1)
    .get()
}

export async function createSubscription(
  db: AppDb,
  input: {
    currentPeriodEnd: Date
    currentPeriodStart: Date
    organizationId?: string
    planId: string
    stripeCustomerId?: string
    stripePriceId?: string
    stripeSubscriptionId?: string
    trialEnd?: Date
    userId?: string
  }
) {
  const id = uuid()
  const status = input.trialEnd ? 'trialing' : 'active'

  await db.insert(subscription).values({
    canceledAt: null,
    currentPeriodEnd: input.currentPeriodEnd,
    currentPeriodStart: input.currentPeriodStart,
    id,
    metadata: null,
    organizationId: input.organizationId ?? null,
    planId: input.planId,
    status,
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripePriceId: input.stripePriceId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    trialEnd: input.trialEnd ?? null,
    userId: input.userId ?? null,
  })

  await logSubscriptionEvent(db, {
    subscriptionId: id,
    toPlanId: input.planId,
    type: 'created',
  })

  return getSubscriptionById(db, id)
}

export async function getSubscriptionById(db: AppDb, subId: string) {
  return db.select().from(subscription).where(eq(subscription.id, subId)).get()
}

export async function updateSubscriptionStatus(db: AppDb, subId: string, status: string) {
  await db
    .update(subscription)
    .set({
      status: status as 'active' | 'canceled' | 'incomplete' | 'past_due' | 'paused' | 'trialing',
    })
    .where(eq(subscription.id, subId))
}

export async function cancelSubscription(db: AppDb, subId: string) {
  await db
    .update(subscription)
    .set({ canceledAt: new Date(), status: 'canceled' })
    .where(eq(subscription.id, subId))

  await logSubscriptionEvent(db, {
    subscriptionId: subId,
    type: 'canceled',
  })
}

export async function reactivateSubscription(db: AppDb, subId: string) {
  await db
    .update(subscription)
    .set({ canceledAt: null, status: 'active' })
    .where(eq(subscription.id, subId))

  await logSubscriptionEvent(db, {
    subscriptionId: subId,
    type: 'renewed',
  })
}

export async function changeSubscriptionPlan(
  db: AppDb,
  subId: string,
  newPlanId: string
): Promise<{ prorationAmountInCents: number }> {
  const sub = await getSubscriptionById(db, subId)
  if (!sub) throw new Error('Subscription not found')

  const oldPlanId = sub.planId
  const oldPlan = await getPlanById(db, oldPlanId)
  const newPlan = await getPlanById(db, newPlanId)
  if (!newPlan) throw new Error('New plan not found')

  const eventType =
    oldPlan && newPlan.priceInCents > oldPlan.priceInCents ? 'upgraded' : 'downgraded'

  const prorationAmountInCents =
    oldPlan && sub.currentPeriodStart && sub.currentPeriodEnd
      ? calculateProration({
          currentPeriodEnd: sub.currentPeriodEnd,
          currentPeriodStart: sub.currentPeriodStart,
          newPlanPriceInCents: newPlan.priceInCents,
          oldPlanPriceInCents: oldPlan.priceInCents,
        })
      : newPlan.priceInCents

  await db.update(subscription).set({ planId: newPlanId }).where(eq(subscription.id, subId))

  await logSubscriptionEvent(db, {
    fromPlanId: oldPlanId,
    metadata: { prorationAmountInCents },
    subscriptionId: subId,
    toPlanId: newPlanId,
    type: eventType,
  })

  return { prorationAmountInCents }
}

async function logSubscriptionEvent(
  db: AppDb,
  input: {
    fromPlanId?: string
    metadata?: Record<string, unknown>
    subscriptionId: string
    toPlanId?: string
    type: string
  }
) {
  await db.insert(subscriptionEvent).values({
    fromPlanId: input.fromPlanId ?? null,
    id: uuid(),
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    subscriptionId: input.subscriptionId,
    toPlanId: input.toPlanId ?? null,
    type: input.type as
      | 'created'
      | 'upgraded'
      | 'downgraded'
      | 'canceled'
      | 'renewed'
      | 'trial_started'
      | 'trial_ended'
      | 'past_due'
      | 'payment_failed',
  })
}

export async function recordUsage(
  db: AppDb,
  input: {
    metricType: 'api_calls' | 'requests' | 'seats' | 'storage'
    periodEnd: Date
    periodStart: Date
    quantity: number
    subscriptionId: string
  }
) {
  await db.insert(usageRecord).values({
    id: uuid(),
    metricType: input.metricType,
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    quantity: input.quantity,
    subscriptionId: input.subscriptionId,
  })
}

// eslint-disable-next-line max-params
export async function getUsageForPeriod(
  db: AppDb,
  subId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return db
    .select()
    .from(usageRecord)
    .where(
      and(
        eq(usageRecord.subscriptionId, subId),
        gte(usageRecord.periodStart, periodStart),
        lte(usageRecord.periodEnd, periodEnd)
      )
    )
}

// Default plan limits for the built-in plans. Extend or override per deployment.
const DEFAULT_PLAN_LIMITS: Record<string, Record<string, number>> = {
  pro: { api_calls: 50_000, storage: 10_000 },
  starter: { api_calls: 1000, storage: 100 },
}

function parsePlanLimits(planSlug: string, featuresJson: string | null): Record<string, number> {
  if (featuresJson) {
    try {
      const parsed = JSON.parse(featuresJson)
      // If features contains a "limits" object, use it
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'limits' in parsed) {
        return (parsed as Record<string, unknown>).limits as Record<string, number>
      }
    } catch {
      // Fall through to defaults
    }
  }
  return DEFAULT_PLAN_LIMITS[planSlug] ?? {}
}

export async function checkUsageLimit(
  db: AppDb,
  input: {
    metricType: 'api_calls' | 'requests' | 'seats' | 'storage'
    periodEnd: Date
    periodStart: Date
    userId: string
  }
): Promise<{ current: number; exceeded: boolean; limit: number | null }> {
  const sub = await getUserSubscription(db, input.userId)
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) {
    return { current: 0, exceeded: false, limit: null }
  }

  const plan = await getPlanById(db, sub.planId)
  if (!plan) {
    return { current: 0, exceeded: false, limit: null }
  }

  const limits = parsePlanLimits(plan.slug, plan.features as string | null)
  const metricLimit = limits[input.metricType]

  if (!metricLimit) {
    return { current: 0, exceeded: false, limit: null }
  }

  const usage = await getUsageForPeriod(db, sub.id, input.periodStart, input.periodEnd)
  const current = usage.reduce((sum, r) => sum + (r.quantity as number), 0)

  return { current, exceeded: current >= metricLimit, limit: metricLimit }
}

export async function getBillingOverview(db: AppDb) {
  const [
    activeSubs,
    totalSubs,
    planDistribution,
    mrrResult,
    netRevenue30d,
    churnedCount,
    trialCount,
  ] = await Promise.all([
    db.all<{ count: number }>(
      sql`SELECT count(*) as count FROM subscription WHERE status IN ('active', 'trialing')`
    ),
    db.all<{ count: number }>(sql`SELECT count(*) as count FROM subscription`),
    db.all<{ count: number; planName: string }>(
      sql`SELECT count(*) as count, sp.name as plan_name FROM subscription s INNER JOIN subscription_plan sp ON s.plan_id = sp.id WHERE s.status IN ('active', 'trialing') GROUP BY sp.name`
    ),
    db.all<{ mrr: number }>(
      sql`SELECT COALESCE(SUM(CASE WHEN sp.interval = 'year' THEN ROUND(sp.price_in_cents / 12.0) ELSE sp.price_in_cents END), 0) as mrr FROM subscription s INNER JOIN subscription_plan sp ON s.plan_id = sp.id WHERE s.status IN ('active', 'trialing')`
    ),
    db.all<{ revenue: number }>(
      sql`SELECT COALESCE(SUM(amount_in_cents), 0) as revenue FROM invoice WHERE status = 'paid' AND paid_at >= unixepoch('now', '-30 days') * 1000`
    ),
    db.all<{ count: number }>(
      sql`SELECT count(*) as count FROM subscription WHERE status = 'canceled' AND canceled_at >= unixepoch('now', '-30 days') * 1000`
    ),
    db.all<{ count: number }>(
      sql`SELECT count(*) as count FROM subscription WHERE status = 'trialing'`
    ),
  ])

  const activeCount = activeSubs[0]?.count ?? 0
  const mrr = mrrResult[0]?.mrr ?? 0

  return {
    activeSubscriptions: activeCount,
    arpu: activeCount > 0 ? Math.round(mrr / activeCount) : 0,
    arr: mrr * 12,
    churnedLast30Days: churnedCount[0]?.count ?? 0,
    mrr,
    netRevenue30d: netRevenue30d[0]?.revenue ?? 0,
    planDistribution: planDistribution.map((row) => ({
      count: row.count,
      planName: row.planName,
    })),
    totalSubscriptions: totalSubs[0]?.count ?? 0,
    trialSubscriptions: trialCount[0]?.count ?? 0,
  }
}

export function calculateProration(input: {
  currentPeriodEnd: Date
  currentPeriodStart: Date
  newPlanPriceInCents: number
  oldPlanPriceInCents: number
}): number {
  const now = Date.now()
  const periodStart = input.currentPeriodStart.getTime()
  const periodEnd = input.currentPeriodEnd.getTime()
  const totalMs = periodEnd - periodStart
  const remainingMs = periodEnd - now

  if (remainingMs <= 0 || totalMs <= 0) return input.newPlanPriceInCents

  const remainingFraction = remainingMs / totalMs
  const unusedCredit = Math.round(input.oldPlanPriceInCents * remainingFraction)
  return Math.max(0, input.newPlanPriceInCents - unusedCredit)
}

const MAX_RETRIES = 5
const BACKOFF_BASE_MS = 1000

function getBackoffDelay(attemptCount: number): number {
  return Math.min(BACKOFF_BASE_MS * 5 ** attemptCount, 60_000)
}

export async function getFailedStripeWebhooks(db: AppDb) {
  return db
    .select()
    .from(stripeWebhookEvent)
    .where(sql`${stripeWebhookEvent.status} IN ('failed', 'retrying')`)
    .orderBy(desc(stripeWebhookEvent.createdAt))
}

export async function getRetryableStripeWebhooks(db: AppDb) {
  const now = new Date()
  return db
    .select()
    .from(stripeWebhookEvent)
    .where(
      and(sql`${stripeWebhookEvent.status} = 'retrying'`, lte(stripeWebhookEvent.nextRetryAt, now))
    )
    .orderBy(stripeWebhookEvent.nextRetryAt)
}

export async function retryStripeWebhook(
  db: AppDb,
  eventId: string
): Promise<{ message: string; success: boolean }> {
  const record = await db
    .select()
    .from(stripeWebhookEvent)
    .where(eq(stripeWebhookEvent.id, eventId))
    .get()

  if (!record) {
    return { message: 'Event not found', success: false }
  }

  if (record.status === 'processed') {
    return { message: 'Event already processed', success: false }
  }

  if (record.retryCount >= MAX_RETRIES) {
    return { message: 'Max retries exceeded', success: false }
  }

  const nextRetryDelay = getBackoffDelay(record.retryCount)
  const nextRetryCount = record.retryCount + 1
  const shouldRetry = nextRetryCount < MAX_RETRIES

  await db
    .update(stripeWebhookEvent)
    .set({
      errorMessage: null,
      nextRetryAt: new Date(Date.now() + nextRetryDelay),
      retryCount: nextRetryCount,
      status: shouldRetry ? 'retrying' : 'failed',
    })
    .where(eq(stripeWebhookEvent.id, eventId))

  return {
    message: shouldRetry
      ? `Queued for retry (${nextRetryCount}/${MAX_RETRIES})`
      : `Final attempt (${nextRetryCount}/${MAX_RETRIES})`,
    success: true,
  }
}
