import {
  assignVariant,
  createExperiment,
  deleteExperiment,
  getExperiment,
  getExperimentResults,
  getExperimentVariants,
  listExperiments,
  recordEvent,
  updateExperiment,
} from '$lib/server/ab-testing'
import {
  createApiKey,
  deleteApiKey,
  getApiKeyUsage,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
} from '$lib/server/api-keys'
import { writeAuditLog } from '$lib/server/audit'
import { getStripeClient, verifyWebhookSignature } from '$lib/server/billing/stripe'
import {
  cancelSubscription,
  changeSubscriptionPlan,
  createPlan,
  createSubscription,
  deactivatePlan,
  getActivePlans,
  getAllPlans,
  getBillingOverview,
  getOrgSubscription,
  getPlanById,
  getUserSubscription,
  reactivateSubscription,
  recordUsage,
  updatePlan,
} from '$lib/server/billing/subscription-service'
import { getConfigHistory, resolveConfig, setConfigValue } from '$lib/server/config-service'
import {
  account as accountTable,
  passkey,
  session as sessionTable,
} from '$lib/server/db/auth.schema'
import {
  announcement,
  apiKey,
  apiKeyUsageLog,
  abAssignment,
  abEvent,
  abExperiment,
  abVariant,
  blogPost,
  blogPostRevision,
  blogPostView,
  blogPostSeries,
  blogPostSlugHistory,
  newsletterSubscriber,
  blogPostTag,
  blogSeries,
  blogTag,
  comment,
  contactSubmission,
  contentReport,
  configVersion,
  featureFlag,
  impersonationSession,
  notification,
  notificationPreference,
  invoice,
  item,
  auditLog,
  organization,
  organizationInvitation,
  organizationMember,
  paymentMethod,
  pushSubscription,
  securityEvent,
  subscription,
  subscriptionPlan,
  systemConfig,
  team,
  teamActivity,
  teamMember,
  user,
  uploadSession,
  webhookDelivery,
  webhookEndpoint,
} from '$lib/server/db/schema'
import { handleBounce } from '$lib/server/email/bounce-handler'
import { createEmailService } from '$lib/server/email/index'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  NotFoundError,
} from '$lib/server/errors'
import { emitEvent } from '$lib/server/events'
import {
  activateKillSwitch,
  createFeatureFlag,
  deleteFeatureFlag,
  evaluateFeatureFlag,
  evaluateMultipleFlags,
  getFeatureFlag,
  listFeatureFlags,
  toggleFeatureFlag,
  updateFeatureFlag,
} from '$lib/server/feature-flags'
import { buildImageUrl, buildSrcset } from '$lib/server/image-processing'
import {
  consumeOAuthState,
  exchangeCodeForTokens,
  generateOAuthParams,
  generateOAuthState,
  getAuthorizationUrl,
} from '$lib/server/integrations/oauth'
import type { OAuthState } from '$lib/server/integrations/oauth'
import { getAvailableProviders, getProvider } from '$lib/server/integrations/providers'
import {
  checkIntegrationHealth,
  createIntegration,
  disconnectIntegration,
  getIntegration,
  listAllIntegrations,
  listIntegrations,
} from '$lib/server/integrations/service'
import {
  createBroadcast,
  createNotification,
  getNotificationPreferences,
  setNotificationPreference,
} from '$lib/server/notifications'
import {
  configureWebPush,
  getUserPushSubscriptions,
  sendPushNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '$lib/server/push'
import { createD1SearchAdapter } from '$lib/server/search/adapter-d1'
import {
  deindexEntity,
  indexBlogPost,
  indexItem,
  reindexAllBlogPosts,
  reindexAllItems,
} from '$lib/server/search/indexer'
import { createSearchService } from '$lib/server/search/service'
import { detectSpam } from '$lib/server/spam-detector'
import { generateStorageKey, validateImageUpload, validateMediaUpload } from '$lib/server/upload'
import {
  cleanupExpiredSessions,
  completeUploadSession,
  createUploadSession,
  deleteUploadSession,
  failUploadSession,
  getUploadProgress,
  getUploadSession,
  listUploadSessions,
  recordChunk,
} from '$lib/server/upload-session'
import { uuid } from '$lib/server/uuid'
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpoint,
  listAllDeliveries,
  listWebhookDeliveries,
  listWebhookEndpoints,
  retryWebhookDelivery,
  sendTestWebhook,
  updateWebhookEndpoint,
} from '$lib/server/webhooks'
import {
  createAnnouncementSchema,
  createCommentSchema,
  createItemSchema,
  createOrganizationSchema,
  createPostSchema,
  createSeriesSchema,
  createReportSchema,
  createTeamSchema,
  addTeamMemberSchema,
  inviteMemberSchema,
  moderateCommentSchema,
  recordReadingSchema,
  recordViewSchema,
  resolveReportSchema,
  subscribeSchema,
  transferOwnershipSchema,
  updateAnnouncementSchema,
  updateConfigSchema,
  updateCommentSchema,
  updateItemSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updatePostSchema,
  updateSeriesSchema,
  updateTeamMemberRoleSchema,
  updateTeamSchema,
} from '$lib/validators'
import {
  assignVariantSchema,
  createExperimentSchema,
  listExperimentsSchema,
  recordEventSchema,
  updateExperimentSchema,
} from '$lib/validators/ab-testing'
import { createApiKeySchema, rotateApiKeySchema, updateApiKeySchema } from '$lib/validators/api-key'
import {
  checkoutSessionSchema,
  changePlanSchema,
  createPlanSchema,
  recordUsageSchema,
  updatePlanSchema,
} from '$lib/validators/billing'
import {
  createFeatureFlagSchema,
  evaluateFlagSchema,
  evaluateMultipleFlagsSchema,
  listFeatureFlagsSchema,
  toggleFeatureFlagSchema,
  updateFeatureFlagSchema,
} from '$lib/validators/feature-flag'
import { indexDocumentSchema, searchSchema } from '$lib/validators/search'
import { createUploadSessionSchema, listUploadSessionsSchema } from '$lib/validators/upload'
import {
  WEBHOOK_EVENT_TYPES,
  createWebhookEndpointSchema,
  listDeliveriesSchema,
  updateWebhookEndpointSchema,
} from '$lib/validators/webhook'
import { zValidator } from '@hono/zod-validator'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod/v4'

import {
  requirePermission,
  requireTeamPermission,
  withOrgMembership,
  withOwnedItem,
  withRateLimit,
  requireAdmin,
  requireUser,
  withServices,
  withSession,
  withTeamMembership,
} from './middleware'
import type { OrgEnv, ProtectedEnv, TeamEnv } from './types'

const validate = <T extends z.ZodType>(schema: T) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            details: result.error.issues.map((i) => ({
              message: i.message,
              path: i.path.map(String).join('.'),
            })),
            message: 'Validation failed',
            status: 400,
          },
        },
        400
      )
    }
  })

const app = new Hono()
  .use('*', secureHeaders(), withServices, withSession)
  .on(['POST', 'GET'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw))
  .onError((err, c) => {
    if (isAppError(err)) {
      return c.json(err.toJSON(), err.status as ContentfulStatusCode)
    }
    console.error(err)
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 } },
      500
    )
  })

// ── Health ───────────────────────────────────────────────────────────

app.get('/api/health', async (c) => {
  const start = Date.now()
  let dbStatus: 'connected' | 'error' | 'unavailable' = 'error'
  try {
    const services = c.get('services')
    if (services) {
      await services.db.run(sql`SELECT 1`)
      dbStatus = 'connected'
    } else {
      dbStatus = 'unavailable'
    }
  } catch {
    dbStatus = 'error'
  }
  return c.json({
    db: dbStatus,
    ok: dbStatus === 'connected',
    responseTime: Date.now() - start,
    time: new Date().toISOString(),
  })
})

// Public: resolve config values (safe keys only)
app.post('/api/config/resolve', async (c) => {
  const services = c.get('services')
  if (!services) return c.json({})
  const body = await c.req.json<{ keys: string[] }>()
  const resolved = await resolveConfig(services.db, body.keys)
  return c.json(resolved)
})

// Public: image URL builder (returns transformed URL)
app.get('/api/image/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'))
  const width = Number(c.req.query('w')) || undefined
  const height = Number(c.req.query('h')) || undefined
  const format = c.req.query('f') as 'avif' | 'webp' | undefined
  const fit = c.req.query('fit') as 'contain' | 'cover' | 'crop' | 'scale-down' | undefined
  const quality = Number(c.req.query('q')) || undefined

  const originalUrl = `/cdn/blog/${key}`
  const url = buildImageUrl(originalUrl, { fit, format, height, quality, width })
  return c.json({ url }, 200, {
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=3600',
  })
})

// Public: image srcset builder
app.get('/api/image/:key/srcset', async (c) => {
  const key = decodeURIComponent(c.req.param('key'))
  const format = c.req.query('f') as 'avif' | 'webp' | undefined

  const originalUrl = `/cdn/blog/${key}`
  const srcset = buildSrcset(originalUrl, undefined, { format })
  return c.json({ srcset }, 200, {
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=3600',
  })
})

// ── Comments (public read) ─────────────────────────────────────────────

app.get('/api/comments/:postId', async (c) => {
  const { db } = c.get('services')
  const postId = c.req.param('postId')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? '20')))
  const offset = (page - 1) * limit

  // Get top-level approved comments
  const topLevel = await db
    .select({
      authorDisplayName: user.displayName,
      authorId: comment.authorId,
      authorImage: user.image,
      authorName: user.name,
      content: comment.content,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
      htmlContent: comment.htmlContent,
      id: comment.id,
      replyCount: sql<number>`(select count(*) from comment c2 where c2.parent_id = ${comment.id} and c2.status = 'approved')`,
    })
    .from(comment)
    .innerJoin(user, eq(comment.authorId, user.id))
    .where(
      and(eq(comment.postId, postId), isNull(comment.parentId), eq(comment.status, 'approved'))
    )
    .orderBy(desc(comment.createdAt))
    .limit(limit)
    .offset(offset)

  // Get replies for these comments
  let replies: Array<{
    authorDisplayName: string | null
    authorId: string
    authorImage: string | null
    authorName: string
    content: string
    createdAt: Date
    editedAt: Date | null
    htmlContent: string | null
    id: string
    parentId: string | null
  }> = []
  if (topLevel.length > 0) {
    const parentIds = topLevel.map((c) => c.id)
    replies = await db
      .select({
        authorDisplayName: user.displayName,
        authorId: comment.authorId,
        authorImage: user.image,
        authorName: user.name,
        content: comment.content,
        createdAt: comment.createdAt,
        editedAt: comment.editedAt,
        htmlContent: comment.htmlContent,
        id: comment.id,
        parentId: comment.parentId,
      })
      .from(comment)
      .innerJoin(user, eq(comment.authorId, user.id))
      .where(and(inArray(comment.parentId, parentIds), eq(comment.status, 'approved')))
      .orderBy(asc(comment.createdAt))
  }

  const replyMap = new Map<string, typeof replies>()
  for (const reply of replies) {
    const pid = reply.parentId!
    if (!replyMap.has(pid)) replyMap.set(pid, [])
    replyMap.get(pid)!.push(reply)
  }

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(comment)
    .where(
      and(eq(comment.postId, postId), isNull(comment.parentId), eq(comment.status, 'approved'))
    )
    .get()

  return c.json({
    comments: topLevel.map((c) => ({ ...c, replies: replyMap.get(c.id) ?? [] })),
    page,
    total: totalResult?.count ?? 0,
  })
})

// ── Appeal (public, rate-limited) ────────────────────────────────────

app.post('/api/appeal', async (c) => {
  const body = await c.req.json<{ email?: string; message?: string; name?: string }>()
  if (!body.email?.trim() || !body.message?.trim() || !body.name?.trim()) {
    throw new BadRequestError('Name, email, and message are required')
  }

  const { db } = c.get('services')
  const appealId = uuid()
  await db.insert(contactSubmission).values({
    email: body.email.trim(),
    id: appealId,
    message: body.message.trim(),
    name: body.name.trim(),
    subject: 'Ban Appeal',
    type: 'ban_appeal',
  })

  // Send notification email if configured
  const { env } = c.get('services')
  if (env.contactNotificationEmail) {
    const emailService = createEmailService(c.get('services').email)
    await emailService.sendContactNotification({
      email: body.email.trim(),
      message: body.message.trim(),
      name: body.name.trim(),
      subject: 'Ban Appeal',
    })
  }

  return c.json({ success: true })
})

// ── Health check (public) ──────────────────────────────────────────────

app.get('/api/health', async (c) => {
  const services = c.get('services')
  const checks: Record<string, 'healthy' | 'unhealthy'> = {}

  // Check D1 connectivity
  try {
    if (services?.db) {
      await services.db.all(sql`SELECT 1`)
      checks.database = 'healthy'
    } else {
      checks.database = 'unhealthy'
    }
  } catch {
    checks.database = 'unhealthy'
  }

  // Check storage connectivity
  try {
    if (services?.storage) {
      await services.storage.list({ limit: 1 })
      checks.storage = 'healthy'
    } else {
      checks.storage = 'healthy'
    }
  } catch {
    checks.storage = 'unhealthy'
  }

  const allHealthy = Object.values(checks).every((s) => s === 'healthy')
  return c.json(
    {
      checks,
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.0.0',
    },
    allHealthy ? 200 : 503
  )
})

// ── Search (public) ───────────────────────────────────────────────────

app.get('/api/search', async (c) => {
  const services = c.get('services')
  if (!services) return c.json({ hits: [], query: '', total: 0 })
  const q = c.req.query('q')?.trim() ?? ''
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? '20')))
  const offset = Math.max(0, Number(c.req.query('offset') ?? '0'))
  const types = c.req.query('types')?.split(',').filter(Boolean)

  if (!q || q.length < 2) return c.json({ hits: [], query: q, total: 0 })

  const adapter = createD1SearchAdapter(services.db)
  const searchService = createSearchService(adapter)
  const results = await searchService.search(q, { entityTypes: types, limit, offset })
  return c.json({ ...results, query: q }, 200, {
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=30',
  })
})

// ── Newsletter (public) ───────────────────────────────────────────────

app.post('/api/newsletter/subscribe', withRateLimit('newsletter', 5, 60_000), async (c) => {
  const body = await c.req.json<{ email?: string; name?: string; source?: string }>()
  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues.map((i) => i.message).join(', ') } }, 400)
  }

  const { db } = c.get('services')
  const { email: emailAddress, name, source } = parsed.data

  // Check if already subscribed
  const existing = await db
    .select()
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.email, emailAddress))
    .get()

  if (existing) {
    if (existing.status === 'confirmed') {
      return c.json({ message: 'Already subscribed' })
    }
    if (existing.status === 'pending') {
      return c.json({ message: 'Check your inbox to confirm your subscription' })
    }
    // Re-subscribe unsubscribed/bounced users
    const newToken = uuid()
    await db
      .update(newsletterSubscriber)
      .set({
        confirmationToken: newToken,
        name: name ?? existing.name,
        source: source ?? existing.source,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscriber.id, existing.id))

    // Send confirmation email
    const { env } = c.get('services')
    const confirmUrl = `${env.origin}/api/newsletter/confirm?token=${newToken}`
    const emailService = createEmailService(c.get('services').email)
    await emailService.sendNewsletterConfirmation(emailAddress, confirmUrl, async () => {
      await handleBounce(db, emailAddress)
    })

    return c.json({ message: 'Check your inbox to confirm your subscription' })
  }

  // New subscriber
  const token = uuid()
  const id = uuid()
  await db.insert(newsletterSubscriber).values({
    confirmationToken: token,
    email: emailAddress,
    id,
    ipAddress: c.req.header('cf-connecting-ip') ?? null,
    name: name ?? null,
    source: source ?? 'blog',
    status: 'pending',
  })

  // Send confirmation email
  const { env: env2 } = c.get('services')
  const confirmUrl2 = `${env2.origin}/api/newsletter/confirm?token=${token}`
  const emailService2 = createEmailService(c.get('services').email)
  await emailService2.sendNewsletterConfirmation(emailAddress, confirmUrl2, async () => {
    await handleBounce(db, emailAddress)
  })

  return c.json({ message: 'Check your inbox to confirm your subscription' }, 201)
})

app.get('/api/newsletter/confirm', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.json({ error: { message: 'Missing token' } }, 400)

  const { db } = c.get('services')
  const subscriber = await db
    .select()
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.confirmationToken, token))
    .get()

  if (!subscriber) {
    return c.json({ error: { message: 'Invalid confirmation link' } }, 404)
  }

  if (subscriber.status === 'confirmed') {
    return c.redirect('/blog?newsletter=already-confirmed')
  }

  // Check token expiry (24 hours)
  const createdAt = subscriber.createdAt.getTime()
  if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    return c.json({ error: { message: 'Confirmation link expired. Please subscribe again.' } }, 410)
  }

  await db
    .update(newsletterSubscriber)
    .set({
      confirmedAt: new Date(),
      status: 'confirmed',
      updatedAt: new Date(),
    })
    .where(eq(newsletterSubscriber.id, subscriber.id))

  return c.redirect('/blog?newsletter=confirmed')
})

app.post('/api/newsletter/unsubscribe', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.json({ error: { message: 'Missing token' } }, 400)

  const { db } = c.get('services')
  const subscriber = await db
    .select()
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.confirmationToken, token))
    .get()

  if (!subscriber) {
    return c.json({ error: { message: 'Invalid unsubscribe link' } }, 404)
  }

  if (subscriber.status === 'unsubscribed') {
    return c.json({ message: 'Already unsubscribed' })
  }

  await db
    .update(newsletterSubscriber)
    .set({
      status: 'unsubscribed',
      unsubscribedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newsletterSubscriber.id, subscriber.id))

  return c.json({ message: 'Successfully unsubscribed' })
})

// ── Analytics (public) ─────────────────────────────────────────────────

app.post('/api/analytics/view', withRateLimit('analytics-view', 30, 60_000), async (c) => {
  const body = await c.req.json<{ postId?: string; referrer?: string }>()
  const parsed = recordViewSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues.map((i) => i.message).join(', ') } }, 400)
  }

  const { db } = c.get('services')
  const { postId, referrer } = parsed.data

  // Verify post exists and is published
  const post = await db
    .select({ id: blogPost.id, status: blogPost.status })
    .from(blogPost)
    .where(eq(blogPost.id, postId))
    .get()
  if (!post || post.status !== 'published') {
    return c.json({ error: { message: 'Post not found' } }, 404)
  }

  // Create visitor hash from IP + User-Agent (no raw PII stored long-term)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown'
  const ua = c.req.header('user-agent') ?? 'unknown'
  const visitorHash = `${ip}:${ua}`.slice(0, 200) // Simple hash for dedup

  // Dedup: skip if same visitor viewed same post within last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentView = await db
    .select({ id: blogPostView.id })
    .from(blogPostView)
    .where(
      and(
        eq(blogPostView.postId, postId),
        eq(blogPostView.visitorHash, visitorHash),
        gte(blogPostView.createdAt, oneHourAgo)
      )
    )
    .get()

  if (recentView) {
    return c.json({ reason: 'dedup', recorded: false })
  }

  // Extract referrer domain
  let referrerDomain: string | null = null
  if (referrer) {
    try {
      referrerDomain = new URL(referrer).hostname
    } catch {
      referrerDomain = null
    }
  }

  const id = uuid()
  await db.insert(blogPostView).values({
    country: c.req.header('cf-ipcountry') ?? null,
    id,
    isCompleted: false,
    postId,
    readTime: null,
    readingProgress: 0,
    referrer: referrer ?? null,
    referrerDomain,
    userAgent: ua.slice(0, 200),
    visitorHash,
  })

  // Increment denormalized view count
  await db
    .update(blogPost)
    .set({ viewCount: sql`${blogPost.viewCount} + 1` })
    .where(eq(blogPost.id, postId))

  return c.json({ recorded: true, viewId: id }, 201)
})

app.post('/api/analytics/reading', withRateLimit('analytics-reading', 10, 60_000), async (c) => {
  const body = await c.req.json<{ postId?: string; progress?: number; readTime?: number }>()
  const parsed = recordReadingSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues.map((i) => i.message).join(', ') } }, 400)
  }

  const { db } = c.get('services')
  const { postId, progress, readTime } = parsed.data

  // Find most recent view for this visitor + post
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown'
  const ua = c.req.header('user-agent') ?? 'unknown'
  const visitorHash = `${ip}:${ua}`.slice(0, 200)

  const view = await db
    .select({
      id: blogPostView.id,
      isCompleted: blogPostView.isCompleted,
      readingProgress: blogPostView.readingProgress,
    })
    .from(blogPostView)
    .where(and(eq(blogPostView.postId, postId), eq(blogPostView.visitorHash, visitorHash)))
    .orderBy(desc(blogPostView.createdAt))
    .limit(1)
    .get()

  if (!view) {
    return c.json({ error: { message: 'No view found' } }, 404)
  }

  const isCompleted = !view.isCompleted && progress >= 80 && readTime >= 30

  await db
    .update(blogPostView)
    .set({
      isCompleted: view.isCompleted || isCompleted,
      readTime,
      readingProgress: Math.max(view.readingProgress, progress),
    })
    .where(eq(blogPostView.id, view.id))

  return c.json({ updated: true })
})

// ── Stripe Webhook (public) ───────────────────────────────────────────

app.post('/billing/webhooks/stripe', async (c) => {
  const stripe = getStripeClient(c.env?.STRIPE_SECRET_KEY)
  if (!stripe) {
    return c.json({ error: 'Billing not configured' }, 503)
  }

  const webhookSecret = c.env?.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return c.json({ error: 'Webhook secret not configured' }, 500)
  }

  const signature = c.req.header('stripe-signature')
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400)
  }

  try {
    const body = await c.req.text()
    const event = await verifyWebhookSignature(stripe, body, signature, webhookSecret)

    const { db } = c.get('services')
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const clientRef = session.client_reference_id
        const subId = session.subscription as string | null
        const customerId = session.customer as string | null

        if (clientRef && subId) {
          const existingSub = await db
            .select({ id: subscription.id })
            .from(subscription)
            .where(eq(subscription.stripeSubscriptionId, subId))
            .get()

          if (!existingSub) {
            const planId = 'plan_pro' // Default plan for checkout
            await createSubscription(db, {
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              currentPeriodStart: new Date(),
              planId,
              stripeCustomerId: customerId ?? undefined,
              stripeSubscriptionId: subId,
              userId: clientRef,
            })
          }
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        await db
          .update(subscription)
          .set({
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            status: sub.status as
              | 'active'
              | 'canceled'
              | 'incomplete'
              | 'past_due'
              | 'paused'
              | 'trialing',
          })
          .where(eq(subscription.stripeSubscriptionId, sub.id))
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await db
          .update(subscription)
          .set({ canceledAt: new Date(), status: 'canceled' })
          .where(eq(subscription.stripeSubscriptionId, sub.id))
        break
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object
        await db.insert(invoice).values({
          amountInCents: inv.amount_paid,
          currency: inv.currency,
          id: uuid(),
          paidAt: new Date(),
          status: 'paid',
          stripeInvoiceId: inv.id,
          subscriptionId: inv.subscription as string | null,
          userId: (inv.customer_email ?? inv.metadata?.userId) as string | null,
        })
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object
        await db.insert(invoice).values({
          amountInCents: inv.amount_due,
          currency: inv.currency,
          dueDate: new Date(inv.due_date * 1000),
          id: uuid(),
          status: 'open',
          stripeInvoiceId: inv.id,
          subscriptionId: inv.subscription as string | null,
          userId: (inv.customer_email ?? inv.metadata?.userId) as string | null,
        })
        break
      }
    }

    return c.json({ received: true })
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }
})

// ── Items (auth required) ────────────────────────────────────────────

const protectedApp = new Hono<ProtectedEnv>().use('*', requireUser)

// ── Content Reports (auth required) ───────────────────────────────────

protectedApp.post(
  '/reports',
  withRateLimit('report', 10, 60_000),
  validate(createReportSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')

    const id = uuid()
    await db.insert(contentReport).values({
      description: parsed.description ?? null,
      entityId: parsed.entityId,
      entityType: parsed.entityType,
      id,
      reason: parsed.reason,
      reporterId: currentUser.id,
    })

    await writeAuditLog(db, {
      action: 'content.report',
      entityId: id,
      entityType: 'content_report',
      metadata: {
        reason: parsed.reason,
        reportedEntityId: parsed.entityId,
        reportedEntityType: parsed.entityType,
      },
      userId: currentUser.id,
    })

    return c.json({ id }, 201)
  }
)

protectedApp.get('/items', async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const status = c.req.query('status')
  const search = c.req.query('search')?.trim()

  const conditions = [eq(item.userId, currentUser.id), isNull(item.deletedAt)]

  if (status === 'active' || status === 'archived') {
    conditions.push(eq(item.status, status))
  }

  if (search) {
    conditions.push(like(item.name, `%${search}%`))
  }

  const items = await db
    .select({
      createdAt: item.createdAt,
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
      updatedAt: item.updatedAt,
    })
    .from(item)
    .where(and(...conditions))
    .orderBy(desc(item.createdAt))

  return c.json({ items })
})

protectedApp.post('/items', validate(createItemSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')

  const created = await db
    .insert(item)
    .values({
      description: parsed.description ?? null,
      name: parsed.name,
      userId: currentUser.id,
    })
    .returning({
      createdAt: item.createdAt,
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
      updatedAt: item.updatedAt,
    })
    .get()

  await writeAuditLog(db, {
    action: 'item.create',
    entityId: created.id,
    entityType: 'item',
    metadata: { name: created.name },
    userId: currentUser.id,
  })

  indexItem(db, created.id).catch(() => {})

  return c.json({ item: created }, 201)
})

protectedApp.get('/items/:id', withOwnedItem, async (c) => {
  const found = c.get('resource') as Awaited<ReturnType<typeof item.$inferSelect>>

  return c.json({
    item: {
      createdAt: found.createdAt,
      description: found.description,
      id: found.id,
      name: found.name,
      status: found.status,
      updatedAt: found.updatedAt,
    },
  })
})

protectedApp.patch('/items/:id', withOwnedItem, validate(updateItemSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const existing = c.get('resource') as typeof item.$inferSelect
  const { id } = existing

  type ItemUpdate = Partial<Pick<typeof item.$inferInsert, 'name' | 'description' | 'status'>> & {
    updatedAt: SQL
  }
  const updates: ItemUpdate = {
    updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
  }

  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.description !== undefined) updates.description = parsed.description ?? null
  if (parsed.status !== undefined) updates.status = parsed.status

  await db.update(item).set(updates).where(eq(item.id, id))

  const updated = await db
    .select()
    .from(item)
    .where(and(eq(item.id, id), eq(item.userId, currentUser.id), isNull(item.deletedAt)))
    .get()

  await writeAuditLog(db, {
    action: 'item.update',
    entityId: id,
    entityType: 'item',
    metadata: { name: updated!.name, status: updated!.status },
    userId: currentUser.id,
  })

  indexItem(db, id).catch(() => {})

  return c.json({
    item: {
      createdAt: updated!.createdAt,
      description: updated!.description,
      id: updated!.id,
      name: updated!.name,
      status: updated!.status,
      updatedAt: updated!.updatedAt,
    },
  })
})

protectedApp.delete('/items/:id', withOwnedItem, async (c) => {
  const { db } = c.get('services')
  const existing = c.get('resource') as typeof item.$inferSelect
  const { id } = existing

  await db
    .update(item)
    .set({
      deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
    })
    .where(eq(item.id, id))

  await writeAuditLog(db, {
    action: 'item.delete',
    entityId: id,
    entityType: 'item',
    metadata: { name: existing.name },
    userId: c.get('user').id,
  })

  deindexEntity(db, id, 'item').catch(() => {})

  return new Response(null, { status: 204 })
})

// ── Security Events ──────────────────────────────────────────────────

protectedApp.get('/security-events', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100)

  const events = await db
    .select()
    .from(securityEvent)
    .where(eq(securityEvent.userId, userId))
    .orderBy(desc(securityEvent.createdAt))
    .limit(limit)

  return c.json({ events })
})

// ── Audit Log ──────────────────────────────────────────────────────────

protectedApp.get('/audit-log', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100)

  const entries = await db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      entityId: auditLog.entityId,
      entityType: auditLog.entityType,
      id: auditLog.id,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)

  return c.json({ entries })
})

// ── Dashboard Stats ────────────────────────────────────────────────────

protectedApp.get('/stats', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const [activeResult] = await db
    .select({ count: count() })
    .from(item)
    .where(and(eq(item.userId, userId), eq(item.status, 'active'), isNull(item.deletedAt)))

  const [totalResult] = await db
    .select({ count: count() })
    .from(item)
    .where(and(eq(item.userId, userId), isNull(item.deletedAt)))

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [weekResult] = await db
    .select({ count: count() })
    .from(item)
    .where(and(eq(item.userId, userId), isNull(item.deletedAt), gte(item.createdAt, oneWeekAgo)))

  return c.json({
    activeItems: activeResult?.count ?? 0,
    itemsThisWeek: weekResult?.count ?? 0,
    totalItems: totalResult?.count ?? 0,
  })
})

// ── Avatar Upload ─────────────────────────────────────────────────────

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_AVATAR_SIZE = 2 * 1024 * 1024

protectedApp.post('/upload-avatar', async (c) => {
  const { storage } = c.get('services')
  const { id: userId } = c.get('user')

  const formData = await c.req.formData()
  const file = formData.get('avatar')
  if (!file || !(file instanceof File)) {
    throw new BadRequestError('No file provided')
  }

  if (!AVATAR_TYPES.has(file.type)) {
    throw new BadRequestError('Invalid file type. Allowed: JPEG, PNG, WebP.')
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new BadRequestError('File too large. Max: 2MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const key = `avatars/${userId}.${ext}`
  const buffer = await file.arrayBuffer()

  await storage.put(key, new Uint8Array(buffer), {
    cacheControl: 'public, max-age=31536000',
    contentType: file.type,
  })

  const imageUrl = `/cdn/blog/${key}`

  // Update user image via direct DB update
  const { db } = c.get('services')
  await db.update(user).set({ image: imageUrl }).where(eq(user.id, userId))

  return c.json({ image: imageUrl })
})

// ── Chunked Uploads (auth required) ────────────────────────────────────

protectedApp.post('/uploads/session', validate(createUploadSessionSchema), async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const input = c.req.valid('json')
  const session = await createUploadSession(db, { ...input, userId })
  return c.json(session, 201)
})

protectedApp.get('/uploads/session/:id', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sessionId = c.req.param('id')
  const session = await getUploadSession(db, sessionId)
  if (!session || (session.userId as string) !== userId) throw new NotFoundError()
  const progress = getUploadProgress(session)
  return c.json({ ...session, progress })
})

protectedApp.post('/uploads/session/:id/chunk', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sessionId = c.req.param('id')
  const session = await getUploadSession(db, sessionId)
  if (!session || (session.userId as string) !== userId) throw new NotFoundError()

  const chunkIndex = Number(c.req.query('index') ?? '0')
  if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
    throw new BadRequestError('Invalid chunk index')
  }

  const result = await recordChunk(db, sessionId, chunkIndex)
  return c.json(result)
})

protectedApp.delete('/uploads/session/:id', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sessionId = c.req.param('id')
  const session = await getUploadSession(db, sessionId)
  if (!session || (session.userId as string) !== userId) throw new NotFoundError()
  await deleteUploadSession(db, sessionId)
  return c.json({ deleted: true })
})

protectedApp.get('/uploads/sessions', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const rawOpts = c.req.query()
  const parsed = listUploadSessionsSchema.safeParse(rawOpts)
  const options = parsed.success ? parsed.data : undefined
  const sessions = await listUploadSessions(db, userId, options)
  return c.json({ sessions })
})

// ── Account Data Export ────────────────────────────────────────────────

protectedApp.get('/account/export', withRateLimit('data-export', 1, 3_600_000), async (c) => {
  const { db } = c.get('services')
  const { id: userId, email } = c.get('user')

  const [
    userData,
    accounts,
    sessions,
    passkeys,
    items,
    auditLogs,
    securityEvents,
    submissions,
    orgMemberships,
  ] = await Promise.all([
    db
      .select({
        bio: user.bio,
        createdAt: user.createdAt,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        name: user.name,
        role: user.role,
        status: user.status,
        timezone: user.timezone,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .get(),
    db
      .select({
        accountId: accountTable.accountId,
        createdAt: accountTable.createdAt,
        providerId: accountTable.providerId,
      })
      .from(accountTable)
      .where(eq(accountTable.userId, userId)),
    db
      .select({
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, userId)),
    db
      .select({
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
        deviceType: passkey.deviceType,
        name: passkey.name,
      })
      .from(passkey)
      .where(eq(passkey.userId, userId)),
    db
      .select({
        createdAt: item.createdAt,
        description: item.description,
        id: item.id,
        name: item.name,
        status: item.status,
        updatedAt: item.updatedAt,
      })
      .from(item)
      .where(and(eq(item.userId, userId), isNull(item.deletedAt))),
    db
      .select({
        action: auditLog.action,
        createdAt: auditLog.createdAt,
        entityId: auditLog.entityId,
        entityType: auditLog.entityType,
        metadata: auditLog.metadata,
      })
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(500),
    db
      .select({
        createdAt: securityEvent.createdAt,
        eventType: securityEvent.eventType,
        ipAddress: securityEvent.ipAddress,
        metadata: securityEvent.metadata,
      })
      .from(securityEvent)
      .where(eq(securityEvent.userId, userId))
      .orderBy(desc(securityEvent.createdAt))
      .limit(500),
    db
      .select({
        createdAt: contactSubmission.createdAt,
        message: contactSubmission.message,
        name: contactSubmission.name,
        subject: contactSubmission.subject,
        type: contactSubmission.type,
      })
      .from(contactSubmission)
      .where(eq(contactSubmission.email, email ?? '')),
    db
      .select({
        joinedAt: organizationMember.joinedAt,
        organizationId: organizationMember.organizationId,
        organizationName: organization.name,
        role: organizationMember.role,
      })
      .from(organizationMember)
      .innerJoin(organization, eq(organizationMember.organizationId, organization.id))
      .where(and(eq(organizationMember.userId, userId), isNull(organization.deletedAt))),
  ])

  const exportData = {
    accounts,
    auditLog: auditLogs,
    contactSubmissions: submissions,
    exportedAt: new Date().toISOString(),
    items,
    organizationMemberships: orgMemberships,
    passkeys,
    securityEvents,
    sessions,
    user: userData,
    version: '1.0',
  }

  await writeAuditLog(db, {
    action: 'account.export',
    entityId: userId,
    entityType: 'user',
    userId,
  })

  return c.json(exportData, 200, {
    'Content-Disposition': `attachment; filename="vibekit-export-${new Date().toISOString().split('T')[0]}.json"`,
  })
})

// ── Account Deletion ──────────────────────────────────────────────────

protectedApp.delete('/account', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, userId))
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))

  return c.json({ success: true })
})

// ── Account Deactivation ──────────────────────────────────────────────

protectedApp.patch('/account/deactivate', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  await db.update(user).set({ status: 'deactivated' }).where(eq(user.id, userId))
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))

  return c.json({ success: true })
})

// ── Onboarding ───────────────────────────────────────────────────────

protectedApp.get('/user/onboarding', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const [row] = await db
    .select({
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
    })
    .from(user)
    .where(eq(user.id, userId))

  return c.json({
    completed: row?.onboardingCompleted ?? false,
    step: row?.onboardingStep ?? 0,
  })
})

protectedApp.post('/user/onboarding', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const body = await c.req.json<{ completed?: boolean; step?: number }>()

  const updates: Record<string, unknown> = {}
  if (typeof body.step === 'number') {
    updates.onboardingStep = Math.max(0, Math.min(3, body.step))
  }
  if (typeof body.completed === 'boolean') {
    updates.onboardingCompleted = body.completed
  }

  if (Object.keys(updates).length > 0) {
    await db.update(user).set(updates).where(eq(user.id, userId))
  }

  return c.json({ success: true })
})

// ── Public Account Reactivation ──────────────────────────────────────

app.post('/api/account/reactivate', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  if (!body.email || !body.password) {
    throw new BadRequestError('Email and password are required')
  }

  const { db } = c.get('services')
  const [found] = await db.select().from(user).where(eq(user.email, body.email))

  if (!found || !found.deletedAt) {
    throw new BadRequestError('No deleted account found with this email')
  }

  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  if (Date.now() - found.deletedAt.getTime() > thirtyDays) {
    throw new BadRequestError('Account is past the 30-day reactivation window')
  }

  const [acct] = await db
    .select({ password: accountTable.password })
    .from(accountTable)
    .where(and(eq(accountTable.userId, found.id), eq(accountTable.providerId, 'credential')))

  if (!acct?.password) {
    throw new BadRequestError('No password set for this account')
  }

  const { verifyPassword } = await import('better-auth/crypto')
  const valid = await verifyPassword({ hash: acct.password, password: body.password })
  if (!valid) {
    throw new BadRequestError('Invalid password')
  }

  await db.update(user).set({ deletedAt: null, status: 'active' }).where(eq(user.id, found.id))

  return c.json({ success: true })
})

// ── Notifications (auth required) ────────────────────────────────────

protectedApp.get('/notifications', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || '20')))
  const offset = (page - 1) * limit

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(notification).where(eq(notification.userId, userId)),
  ])

  return c.json({
    limit,
    notifications: rows,
    page,
    total: countResult[0]?.value ?? 0,
  })
})

protectedApp.get('/notifications/unread-count', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const [result] = await db
    .select({ value: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))

  return c.json({ count: result?.value ?? 0 })
})

protectedApp.patch('/notifications/read-all', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))

  return c.json({ success: true })
})

protectedApp.patch('/notifications/:id/read', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const id = c.req.param('id')

  const existing = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.id, id), eq(notification.userId, userId)))
    .get()

  if (!existing) {
    throw new NotFoundError()
  }

  await db.update(notification).set({ readAt: new Date() }).where(eq(notification.id, id))

  return c.json({ success: true })
})

protectedApp.delete('/notifications/:id', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const id = c.req.param('id')

  const existing = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.id, id), eq(notification.userId, userId)))
    .get()

  if (!existing) {
    throw new NotFoundError()
  }

  await db.delete(notification).where(eq(notification.id, id))

  return c.json({ success: true })
})

// ── Notification Preferences (auth required) ──────────────────────────

protectedApp.get('/notifications/preferences', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const prefs = await getNotificationPreferences(db, userId)

  return c.json({ preferences: prefs })
})

protectedApp.patch('/notifications/preferences', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const body = await c.req.json<{ channel: 'email' | 'in_app'; enabled: boolean; type: string }>()

  if (!body.channel || !body.type || typeof body.enabled !== 'boolean') {
    throw new BadRequestError('channel, type, and enabled are required')
  }

  if (body.channel !== 'email' && body.channel !== 'in_app') {
    throw new BadRequestError('channel must be "email" or "in_app"')
  }

  await setNotificationPreference(db, {
    channel: body.channel,
    enabled: body.enabled,
    type: body.type,
    userId,
  })

  return c.json({ success: true })
})

// ── Billing (auth required) ─────────────────────────────────────────────

protectedApp.get('/billing/plans', async (c) => {
  const { db } = c.get('services')
  const plans = await getActivePlans(db)
  return c.json({ plans })
})

protectedApp.get('/billing/subscription', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sub = await getUserSubscription(db, userId)
  return c.json({ subscription: sub })
})

protectedApp.post('/billing/checkout', async (c) => {
  const body = await c.req.json()
  const parsed = checkoutSessionSchema.safeParse(body)
  if (!parsed.success) {
    throw new BadRequestError('Invalid checkout parameters')
  }

  const { db } = c.get('services')
  const user = c.get('user')
  const stripe = getStripeClient(c.env?.STRIPE_SECRET_KEY)

  const plan = await getPlanById(db, parsed.data.planId)
  if (!plan) throw new NotFoundError()

  if (stripe && plan.stripePriceId) {
    const session = await import('$lib/server/billing/stripe').then((m) =>
      m.createCheckoutSession(stripe, {
        cancelUrl: parsed.data.cancelUrl,
        customerEmail: user.email,
        priceId: plan.stripePriceId,
        successUrl: parsed.data.successUrl,
        trialDays: plan.trialDays,
        userId: user.id,
      })
    )
    return c.json({ url: session.url })
  }

  // Without Stripe, create subscription directly
  const sub = await createSubscription(db, {
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    currentPeriodStart: new Date(),
    organizationId: parsed.data.organizationId,
    planId: plan.id,
    trialEnd:
      plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : undefined,
    userId: user.id,
  })

  return c.json({ subscription: sub })
})

protectedApp.post('/billing/portal', async (c) => {
  const stripe = getStripeClient(c.env?.STRIPE_SECRET_KEY)
  if (!stripe) {
    throw new BadRequestError('Billing portal not configured')
  }

  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sub = await getUserSubscription(db, userId)
  if (!sub?.stripeCustomerId) {
    throw new BadRequestError('No billing account found')
  }

  const body = await c.req.json<{ returnUrl: string }>()
  const session = await import('$lib/server/billing/stripe').then((m) =>
    m.createBillingPortalSession(stripe, {
      customerId: sub.stripeCustomerId,
      returnUrl: body.returnUrl,
    })
  )

  return c.json({ url: session.url })
})

protectedApp.post('/billing/change-plan', async (c) => {
  const body = await c.req.json()
  const parsed = changePlanSchema.safeParse(body)
  if (!parsed.success) {
    throw new BadRequestError('Invalid plan change parameters')
  }

  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sub = await getUserSubscription(db, userId)
  if (!sub) throw new BadRequestError('No active subscription')

  const newPlan = await getPlanById(db, parsed.data.newPlanId)
  if (!newPlan) throw new NotFoundError()

  await changeSubscriptionPlan(db, sub.id, parsed.data.newPlanId)

  return c.json({ success: true })
})

protectedApp.post('/billing/cancel', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const sub = await getUserSubscription(db, userId)
  if (!sub) throw new BadRequestError('No active subscription')

  await cancelSubscription(db, sub.id)

  return c.json({ success: true })
})

protectedApp.post('/billing/reactivate', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const sub = await db
    .select()
    .from(subscription)
    .where(and(eq(subscription.userId, userId), eq(subscription.status, 'canceled')))
    .orderBy(desc(subscription.createdAt))
    .limit(1)
    .get()

  if (!sub) throw new BadRequestError('No canceled subscription found')

  await reactivateSubscription(db, sub.id)

  return c.json({ success: true })
})

protectedApp.get('/billing/invoices', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const invoices = await db
    .select()
    .from(invoice)
    .where(eq(invoice.userId, userId))
    .orderBy(desc(invoice.createdAt))

  return c.json({ invoices })
})

protectedApp.post('/billing/usage', validate(recordUsageSchema), async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const parsed = c.req.valid('json')

  const sub = await getUserSubscription(db, userId)
  if (!sub) throw new BadRequestError('No active subscription')

  await recordUsage(db, {
    metricType: parsed.metricType,
    periodEnd: sub.currentPeriodEnd,
    periodStart: sub.currentPeriodStart,
    quantity: parsed.quantity,
    subscriptionId: sub.id,
  })

  return c.json({ success: true })
})

// ── Push Notifications (auth required) ──────────────────────────────────

protectedApp.post('/push/subscribe', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const body = await c.req.json<{ auth: string; endpoint: string; p256dh: string }>()

  if (!body.endpoint || !body.p256dh || !body.auth) {
    throw new BadRequestError('endpoint, p256dh, and auth are required')
  }

  const userAgent = c.req.header('user-agent')
  await subscribeToPush(db, {
    auth: body.auth,
    endpoint: body.endpoint,
    p256dh: body.p256dh,
    userAgent: userAgent ?? undefined,
    userId,
  })

  return c.json({ success: true }, 201)
})

protectedApp.post('/push/unsubscribe', async (c) => {
  const { db } = c.get('services')
  const body = await c.req.json<{ endpoint: string }>()

  if (!body.endpoint) {
    throw new BadRequestError('endpoint is required')
  }

  await unsubscribeFromPush(db, body.endpoint)
  return c.json({ success: true })
})

protectedApp.get('/push/subscriptions', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const subs = await getUserPushSubscriptions(db, userId)
  return c.json({
    subscriptions: subs.map((s) => ({
      createdAt: s.createdAt,
      endpoint: s.endpoint,
      id: s.id,
    })),
  })
})

protectedApp.post('/push/test', withRateLimit('push-test', 3, 60_000), async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const vapidPublicKey = c.env?.VAPID_PUBLIC_KEY
  const vapidPrivateKey = c.env?.VAPID_PRIVATE_KEY
  const vapidSubject = c.env?.VAPID_SUBJECT

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new BadRequestError('Push notifications not configured')
  }

  configureWebPush(vapidPublicKey, vapidPrivateKey, vapidSubject)

  const result = await sendPushNotification(db, userId, {
    body: 'This is a test push notification',
    data: { url: '/app/notifications' },
    title: 'Test Notification',
  })

  return c.json(result)
})

// ── API Keys (auth required) ────────────────────────────────────────────

protectedApp.get('/api-keys', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const keys = await listApiKeys(db, userId)
  return c.json({ keys })
})

protectedApp.post(
  '/api-keys',
  withRateLimit('api-key-create', 10, 60_000),
  validate(createApiKeySchema),
  async (c) => {
    const { db } = c.get('services')
    const { id: userId } = c.get('user')
    const input = c.req.valid('json')
    const result = await createApiKey(db, userId, input)
    await writeAuditLog(db, {
      action: 'api_key.created',
      entityId: result.id,
      entityType: 'api_key',
      userId,
    })
    return c.json(result, 201)
  }
)

protectedApp.patch('/api-keys/:id', validate(updateApiKeySchema), async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const keyId = c.req.param('id')
  const input = c.req.valid('json')
  await updateApiKey(db, keyId, userId, input)
  await writeAuditLog(db, {
    action: 'api_key.updated',
    entityId: keyId,
    entityType: 'api_key',
    userId,
  })
  return c.json({ ok: true })
})

protectedApp.post('/api-keys/:id/rotate', withRateLimit('api-key-rotate', 5, 60_000), async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const keyId = c.req.param('id')
  const result = await rotateApiKey(db, keyId, userId)
  if (!result) throw new NotFoundError('API key not found')
  await writeAuditLog(db, {
    action: 'api_key.rotated',
    entityId: keyId,
    entityType: 'api_key',
    userId,
  })
  return c.json(result)
})

protectedApp.post('/api-keys/:id/revoke', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const keyId = c.req.param('id')
  const revoked = await revokeApiKey(db, keyId, userId)
  if (!revoked) throw new NotFoundError('API key not found')
  await writeAuditLog(db, {
    action: 'api_key.revoked',
    entityId: keyId,
    entityType: 'api_key',
    userId,
  })
  return c.json({ ok: true })
})

protectedApp.delete('/api-keys/:id', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const keyId = c.req.param('id')
  await deleteApiKey(db, keyId, userId)
  await writeAuditLog(db, {
    action: 'api_key.deleted',
    entityId: keyId,
    entityType: 'api_key',
    userId,
  })
  return c.json({ ok: true })
})

protectedApp.get('/api-keys/:id/usage', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const keyId = c.req.param('id')
  const limit = Number(c.req.query('limit') ?? '50')
  const usage = await getApiKeyUsage(db, keyId, Math.min(limit, 200))
  return c.json({ usage })
})

// ── Feature Flags (auth required) ────────────────────────────────────────

protectedApp.post('/feature-flags/evaluate/:key', validate(evaluateFlagSchema), async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const { context } = c.req.valid('json')
  const enabled = await evaluateFeatureFlag(db, key, context)
  return c.json({ enabled, key })
})

protectedApp.post('/feature-flags/evaluate', validate(evaluateMultipleFlagsSchema), async (c) => {
  const { db } = c.get('services')
  const { keys, context } = c.req.valid('json')
  const flags = await evaluateMultipleFlags(db, keys, context)
  return c.json(flags)
})

// ── A/B Testing (auth required) ─────────────────────────────────────────

protectedApp.post('/experiments/:key/assign', validate(assignVariantSchema), async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const input = c.req.valid('json')
  const { id: userId } = c.get('user')
  const result = await assignVariant(db, key, { ...input, userId })
  if (!result) throw new NotFoundError()
  return c.json({
    experiment: { key: (result.experiment as Record<string, unknown>).key },
    variant: {
      id: (result.variant as Record<string, unknown>).id,
      isControl: (result.variant as Record<string, unknown>).isControl,
      name: (result.variant as Record<string, unknown>).name,
      payload: (result.variant as Record<string, unknown>).payload,
    },
  })
})

protectedApp.post('/experiments/:key/event', validate(recordEventSchema), async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const input = c.req.valid('json')
  const { id: userId } = c.get('user')
  const experiment = await getExperiment(db, key)
  if (!experiment) throw new NotFoundError()

  const { sessionId } = input
  const assignment = await assignVariant(db, key, { sessionId, userId })
  if (!assignment) throw new NotFoundError()

  await recordEvent(db, {
    ...input,
    experimentId: experiment.id as string,
    variantId: (assignment.variant as Record<string, unknown>).id as string,
  })
  return c.json({ recorded: true })
})

protectedApp.get('/experiments/:key/results', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const results = await getExperimentResults(db, key)
  return c.json({ results })
})

// ── Webhooks ─────────────────────────────────────────────────────────

protectedApp.get('/webhooks', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const endpoints = await listWebhookEndpoints(db, userId)
  return c.json({ endpoints })
})

protectedApp.post(
  '/webhooks',
  withRateLimit('webhook-create', 10, 60_000),
  validate(createWebhookEndpointSchema),
  async (c) => {
    const { db } = c.get('services')
    const { id: userId } = c.get('user')
    const input = c.req.valid('json')
    const result = await createWebhookEndpoint(db, userId, input)
    await emitEvent(db, {
      action: 'webhook.create',
      entityId: result.id,
      entityType: 'webhook_endpoint',
      userId,
    })
    return c.json(result, 201)
  }
)

protectedApp.patch('/webhooks/:id', validate(updateWebhookEndpointSchema), async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const endpointId = c.req.param('id')
  const input = c.req.valid('json')
  const result = await updateWebhookEndpoint(db, endpointId, userId, input)
  if (!result) throw new NotFoundError()
  await emitEvent(db, {
    action: 'webhook.update',
    entityId: endpointId,
    entityType: 'webhook_endpoint',
    userId,
  })
  return c.json({ ok: true })
})

protectedApp.delete('/webhooks/:id', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const endpointId = c.req.param('id')
  await deleteWebhookEndpoint(db, endpointId, userId)
  await emitEvent(db, {
    action: 'webhook.delete',
    entityId: endpointId,
    entityType: 'webhook_endpoint',
    userId,
  })
  return c.json({ ok: true })
})

protectedApp.post('/webhooks/:id/test', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const endpointId = c.req.param('id')
  const endpoint = await getWebhookEndpoint(db, endpointId, userId)
  if (!endpoint) throw new NotFoundError()
  const result = await sendTestWebhook(db, {
    id: endpoint.id,
    secret: endpoint.secret as string,
    url: endpoint.url as string,
  })
  return c.json(result)
})

protectedApp.get('/webhooks/:id/deliveries', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const endpointId = c.req.param('id')
  const endpoint = await getWebhookEndpoint(db, endpointId, userId)
  if (!endpoint) throw new NotFoundError()
  const limit = Number(c.req.query('limit') ?? '50')
  const deliveries = await listWebhookDeliveries(db, endpointId, Math.min(limit, 100))
  return c.json({ deliveries })
})

// ── Automation Manifest (public) ───────────────────────────────────────

app.get('/api/automation/manifest', async (c) => {
  const triggers = WEBHOOK_EVENT_TYPES.filter((t) => t !== '*').map((event) => ({
    description: `Fires when a ${event.replace('.', ' ')} event occurs`,
    event,
    name: event,
    payloadExample: {
      data: { id: 'uuid', type: event.split('.')[0] },
      eventType: event,
      occurredAt: Date.now(),
      webhookId: 'uuid',
    },
  }))

  const actions = [
    {
      description: 'Retrieve a list of items',
      endpoint: 'GET /api/items',
      method: 'GET',
      name: 'List Items',
      path: '/api/items',
    },
    {
      description: 'Create a new item',
      endpoint: 'POST /api/items',
      method: 'POST',
      name: 'Create Item',
      path: '/api/items',
      requestBody: { content: 'string', title: 'string' },
    },
    {
      description: 'Publish a blog post',
      endpoint: 'POST /api/blog/:id/publish',
      method: 'POST',
      name: 'Publish Blog Post',
      path: '/api/blog/:id/publish',
    },
    {
      description: 'Search blog posts',
      endpoint: 'GET /api/blog/search?q=...',
      method: 'GET',
      name: 'Search Blog',
      path: '/api/blog/search',
    },
    {
      description: 'Send a notification broadcast',
      endpoint: 'POST /api/admin/notifications/broadcast',
      method: 'POST',
      name: 'Broadcast Notification',
      path: '/api/admin/notifications/broadcast',
      requestBody: { message: 'string', title: 'string' },
    },
    {
      description: 'List organization members',
      endpoint: 'GET /api/orgs/:orgId/members',
      method: 'GET',
      name: 'List Org Members',
      path: '/api/orgs/:orgId/members',
    },
  ]

  return c.json({
    actions,
    auth: {
      description: 'API key with vk_ prefix',
      headerName: 'Authorization',
      headerValueFormat: 'Bearer vk_your_api_key',
      scopes: [
        'blog.read',
        'blog.write',
        'billing.read',
        'items.read',
        'items.write',
        'orgs.read',
        'orgs.write',
        'teams.read',
        'teams.write',
        'users.read',
        'webhooks.read',
        'webhooks.write',
        'analytics.read',
      ],
      type: 'bearer',
    },
    baseUrl: c.req.url.replace('/api/automation/manifest', '/api'),
    name: 'Vibekit',
    triggers,
    version: '1.0.0',
    webhookSetup: {
      createEndpoint: 'POST /api/webhooks',
      deleteEndpoint: 'DELETE /api/webhooks/:id',
      description: 'Subscribe to events by creating webhook endpoints',
      examplePayload: {
        events: ['blog.create'],
        url: 'https://your-app.com/webhooks/vibekit',
      },
      signatureHeader: 'X-Webhook-Signature',
      signatureAlgorithm: 'HMAC-SHA256',
      timestampHeader: 'X-Webhook-Timestamp',
    },
  })
})

// ── Integrations (auth required) ────────────────────────────────────────

protectedApp.get('/integrations/providers', async (c) => {
  const { env } = c.get('services')
  const providers = getAvailableProviders(env as Record<string, string | undefined>)
  return c.json({ providers })
})

protectedApp.get('/integrations', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const integrations = await listIntegrations(db, userId)
  return c.json({ integrations })
})

protectedApp.post('/integrations/connect/:provider', async (c) => {
  const { db, env } = c.get('services')
  const { id: userId } = c.get('user')
  const provider = c.req.param('provider')

  if (!getProvider(provider)) {
    throw new NotFoundError()
  }

  const { codeVerifier, state: oauthState } = generateOAuthParams()
  const stateData: OAuthState & { codeVerifier: string } = {
    codeVerifier,
    provider,
    userId,
  }
  const state = generateOAuthState(stateData)

  const baseUrl = env.ORIGIN ?? 'http://localhost:5173'
  const authorizeUrl = getAuthorizationUrl(
    provider,
    state,
    codeVerifier,
    env as Record<string, string | undefined>,
    baseUrl
  )

  return c.json({ url: authorizeUrl.toString() })
})

protectedApp.delete('/integrations/:id', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const integrationId = c.req.param('id')
  const result = await disconnectIntegration(db, integrationId, userId)
  if (!result) throw new NotFoundError()
  return c.json({ ok: true })
})

protectedApp.post('/integrations/:id/refresh', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const integrationId = c.req.param('id')
  const record = await getIntegration(db, integrationId, userId)
  if (!record) throw new NotFoundError()
  const result = await checkIntegrationHealth(db, integrationId)
  return c.json(result)
})

protectedApp.get('/integrations/:id/status', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')
  const integrationId = c.req.param('id')
  const record = await getIntegration(db, integrationId, userId)
  if (!record) throw new NotFoundError()
  const result = await checkIntegrationHealth(db, integrationId)
  return c.json(result)
})

// OAuth callback (public — validates state token)
app.get('/api/integrations/callback/:provider', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) return c.json({ error: 'Missing code or state' }, 400)

  const stateData = consumeOAuthState(state)
  if (!stateData) return c.json({ error: 'Invalid or expired state' }, 400)
  if (stateData.provider !== c.req.param('provider')) {
    return c.json({ error: 'Provider mismatch' }, 400)
  }

  const { db, env } = c.get('services')

  const codeVerifier = stateData.codeVerifier

  if (!codeVerifier) return c.json({ error: 'Missing code verifier' }, 400)

  try {
    const baseUrl = env.ORIGIN ?? 'http://localhost:5173'
    const tokens = await exchangeCodeForTokens(
      stateData.provider,
      code,
      codeVerifier,
      env as Record<string, string | undefined>,
      baseUrl
    )

    const expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined

    const scopes = tokens.scope ? tokens.scope.split(' ') : []

    const result = await createIntegration(db, {
      accessToken: tokens.accessToken,
      expiresAt,
      provider: stateData.provider,
      refreshToken: tokens.refreshToken,
      scopes,
      userId: stateData.userId,
    })

    const redirectUrl = stateData.redirectUrl ?? '/app/settings/integrations'
    return c.redirect(redirectUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed'
    return c.json({ error: message }, 500)
  }
})

// ── Comments (auth required) ──────────────────────────────────────────

protectedApp.post(
  '/comments/:postId',
  withRateLimit('comment-create', 5, 60_000),
  validate(createCommentSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const postId = c.req.param('postId')

    // Verify post exists and is published
    const post = await db
      .select({ id: blogPost.id })
      .from(blogPost)
      .where(
        and(eq(blogPost.id, postId), eq(blogPost.status, 'published'), isNull(blogPost.deletedAt))
      )
      .get()
    if (!post) throw new NotFoundError('Post not found')

    // If replying, verify parent comment exists and belongs to same post
    if (parsed.parentId) {
      const parent = await db
        .select({ id: comment.id, parentId: comment.parentId })
        .from(comment)
        .where(and(eq(comment.id, parsed.parentId), eq(comment.postId, postId)))
        .get()
      if (!parent) throw new NotFoundError('Parent comment not found')
      // Only allow one level of nesting
      if (parent.parentId) throw new BadRequestError('Cannot reply to a reply')
    }

    // Spam detection
    const spamResult = await detectSpam({
      content: parsed.content,
      db,
      ipAddress: c.req.header('cf-connecting-ip') ?? '',
      userId: currentUser.id,
    })

    // Auto-approve for admins, otherwise use spam result
    const status: 'approved' | 'pending' | 'spam' =
      currentUser.role === 'admin' ? 'approved' : spamResult.isSpam ? 'spam' : 'pending'

    const id = uuid()
    await db.insert(comment).values({
      authorId: currentUser.id,
      content: parsed.content,
      htmlContent: parsed.content, // Stored as plain text for now
      id,
      ipAddress: c.req.header('cf-connecting-ip') ?? null,
      moderatedAt: status !== 'pending' ? new Date() : null,
      moderatedBy: status !== 'pending' ? currentUser.id : null,
      parentId: parsed.parentId ?? null,
      postId,
      spamReason: spamResult.isSpam ? JSON.stringify(spamResult.reasons) : null,
      spamScore: spamResult.score,
      status,
      userAgent: c.req.header('user-agent') ?? null,
    })

    await writeAuditLog(db, {
      action: 'comment.create',
      entityId: id,
      entityType: 'comment',
      metadata: { postId, spamScore: spamResult.score, status },
      userId: currentUser.id,
    })

    // Notify post author
    const postAuthor = await db
      .select({ authorId: blogPost.authorId, title: blogPost.title })
      .from(blogPost)
      .where(eq(blogPost.id, postId))
      .get()
    if (postAuthor && postAuthor.authorId !== currentUser.id) {
      await createNotification(db, {
        body: `New comment on "${postAuthor.title}"`,
        entityId: id,
        entityType: 'comment',
        title: 'New comment on your post',
        type: 'info',
        userId: postAuthor.authorId,
      })
    }

    return c.json({ id, status }, 201)
  }
)

protectedApp.patch('/comments/:id', validate(updateCommentSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db.select().from(comment).where(eq(comment.id, id)).get()
  if (!existing) throw new NotFoundError()
  if (existing.authorId !== currentUser.id) throw new ForbiddenError('Not your comment')

  await db
    .update(comment)
    .set({
      content: parsed.content,
      editedAt: new Date(),
      htmlContent: parsed.content,
      updatedAt: new Date(),
    })
    .where(eq(comment.id, id))

  return c.json({ success: true })
})

protectedApp.delete('/comments/:id', async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db.select().from(comment).where(eq(comment.id, id)).get()
  if (!existing) throw new NotFoundError()
  // Allow author or admin to delete
  if (existing.authorId !== currentUser.id && currentUser.role !== 'admin') {
    throw new ForbiddenError('Not your comment')
  }

  await db.delete(comment).where(eq(comment.id, id))

  await writeAuditLog(db, {
    action: 'comment.delete',
    entityId: id,
    entityType: 'comment',
    metadata: { postId: existing.postId },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Blog (admin only) ────────────────────────────────────────────────

const blogApp = new Hono<ProtectedEnv>().use('*', requireAdmin)

const toNullable = (v: string | undefined | null) => v ?? null

blogApp.get('/search', async (c) => {
  const { db } = c.get('services')
  const q = c.req.query('q')?.trim()
  if (!q || q.length < 2) return c.json({ results: [] })

  const results = await db
    .select({
      excerpt: blogPost.excerpt,
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      status: blogPost.status,
      title: blogPost.title,
    })
    .from(blogPost)
    .where(
      and(
        isNull(blogPost.deletedAt),
        or(
          like(blogPost.title, `%${q}%`),
          like(blogPost.slug, `%${q}%`),
          like(blogPost.excerpt, `%${q}%`),
          like(blogPost.contentBody, `%${q}%`)
        )
      )
    )
    .orderBy(desc(blogPost.createdAt))
    .limit(10)

  return c.json({ results })
})

blogApp.get('/media', async (c) => {
  const prefix = c.req.query('prefix') || undefined
  const cursor = c.req.query('cursor') || undefined
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)))

  const result = await c.get('services').storage.list(prefix, cursor, limit)
  return c.json(result)
})

blogApp.get('/:id/content', async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const post = await db
    .select({ contentBody: blogPost.contentBody, id: blogPost.id, title: blogPost.title })
    .from(blogPost)
    .where(and(isNull(blogPost.deletedAt), or(eq(blogPost.id, id), eq(blogPost.slug, id))))
    .get()
  if (!post) {
    throw new NotFoundError()
  }

  return c.json({ post })
})

blogApp.get('/', async (c) => {
  const { db } = c.get('services')
  const rawStatus = c.req.query('status') ?? ''
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = 20
  const offset = (page - 1) * limit
  const q = c.req.query('q')?.trim()
  const rawSort = c.req.query('sort') ?? 'createdAt:desc'

  const validStatuses = ['draft', 'published', 'archived', 'scheduled'] as const
  const isTrash = rawStatus === 'trash'
  const filterStatus = validStatuses.includes(rawStatus as (typeof validStatuses)[number])
    ? (rawStatus as (typeof validStatuses)[number])
    : null

  const conditions: SQL[] = []
  if (isTrash) {
    conditions.push(isNotNull(blogPost.deletedAt))
  } else if (filterStatus) {
    conditions.push(eq(blogPost.status, filterStatus), isNull(blogPost.deletedAt))
  } else {
    conditions.push(isNull(blogPost.deletedAt))
  }

  if (q && q.length >= 2) {
    conditions.push(
      or(
        like(blogPost.title, `%${q}%`),
        like(blogPost.slug, `%${q}%`),
        like(blogPost.excerpt, `%${q}%`),
        like(blogPost.contentBody, `%${q}%`)
      )!
    )
  }

  const whereClause = and(...conditions)!

  const sortParts = rawSort.split(':')
  const sortField = sortParts[0] ?? 'createdAt'
  const sortDir = sortParts[1] === 'asc' ? 'asc' : 'desc'
  const sortMap: Record<string, Record<string, ReturnType<typeof desc>>> = {
    createdAt: { asc: asc(blogPost.createdAt), desc: desc(blogPost.createdAt) },
    publishedAt: { asc: asc(blogPost.publishedAt), desc: desc(blogPost.publishedAt) },
    slug: { asc: asc(blogPost.slug), desc: desc(blogPost.slug) },
    status: { asc: asc(blogPost.status), desc: desc(blogPost.status) },
    title: { asc: asc(blogPost.title), desc: desc(blogPost.title) },
  }
  const orderBy = sortMap[sortField]?.[sortDir] ?? desc(blogPost.createdAt)

  const [countResult, posts] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)` })
      .from(blogPost)
      .where(whereClause),
    db
      .select({
        coverImageUrl: blogPost.coverImageUrl,
        createdAt: blogPost.createdAt,
        deletedAt: blogPost.deletedAt,
        excerpt: blogPost.excerpt,
        id: blogPost.id,
        publishedAt: blogPost.publishedAt,
        scheduledAt: blogPost.scheduledAt,
        slug: blogPost.slug,
        status: blogPost.status,
        title: blogPost.title,
        updatedAt: blogPost.updatedAt,
      })
      .from(blogPost)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
  ])

  return c.json({ limit, page, posts, total: countResult[0]?.value ?? 0 })
})

blogApp.post('/', withRateLimit('blog-mutate', 50), validate(createPostSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')

  const existing = await db
    .select({ id: blogPost.id })
    .from(blogPost)
    .where(eq(blogPost.slug, parsed.slug))
    .get()

  if (existing) {
    throw new ConflictError('Slug already exists')
  }

  const id = uuid()
  const { title, slug, excerpt, contentBody, coverImageUrl, seoTitle, seoDescription, status } =
    parsed
  await db.insert(blogPost).values({
    authorId: currentUser.id,
    contentBody: toNullable(contentBody),
    coverImageUrl: toNullable(coverImageUrl),
    excerpt: toNullable(excerpt),
    id,
    publishedAt: status === 'published' ? new Date() : null,
    seoDescription: toNullable(seoDescription),
    seoTitle: toNullable(seoTitle),
    slug,
    status,
    title,
  })

  if (status === 'published') {
    await c.get('services').cache.purgeBlog(slug)
  }

  if (parsed.tagIds?.length) {
    await db.insert(blogPostTag).values(parsed.tagIds.map((tagId) => ({ postId: id, tagId })))
  }

  if (parsed.seriesIds?.length) {
    await db
      .insert(blogPostSeries)
      .values(parsed.seriesIds.map((s) => ({ postId: id, seriesId: s.id, sortOrder: s.sortOrder })))
  }

  await writeAuditLog(db, {
    action: 'blog.create',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug, status, title },
    userId: currentUser.id,
  })

  indexBlogPost(db, id).catch(() => {})

  return c.json({ id }, 201)
})

// ── Tags ────────────────────────────────────────────────────────────

blogApp.get('/tags', async (c) => {
  const { db } = c.get('services')
  const tags = await db
    .select({
      id: blogTag.id,
      name: blogTag.name,
      postCount: sql<number>`(select count(*) from ${blogPostTag} where ${blogPostTag.tagId} = ${blogTag.id})`,
      slug: blogTag.slug,
    })
    .from(blogTag)
    .orderBy(blogTag.name)
  return c.json({ tags })
})

blogApp.post('/tags', withRateLimit('blog-mutate'), async (c) => {
  const { name } = (await c.req.json()) as { name?: string }
  if (!name?.trim()) throw new BadRequestError('Tag name is required')

  const { db } = c.get('services')
  const currentUser = c.get('user')

  const slugValue = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const existing = await db
    .select({ id: blogTag.id })
    .from(blogTag)
    .where(eq(blogTag.slug, slugValue))
    .get()
  if (existing) throw new ConflictError('Tag already exists')

  const id = uuid()
  await db.insert(blogTag).values({ id, name: name.trim(), slug: slugValue })

  await writeAuditLog(db, {
    action: 'blog_tag.create',
    entityId: id,
    entityType: 'blog_tag',
    metadata: { name: name.trim(), slug: slugValue },
    userId: currentUser.id,
  })

  return c.json({ id }, 201)
})

blogApp.delete('/tags/:id', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db
    .select({ name: blogTag.name })
    .from(blogTag)
    .where(eq(blogTag.id, id))
    .get()
  if (!existing) throw new NotFoundError()

  await db.delete(blogPostTag).where(eq(blogPostTag.tagId, id))
  await db.delete(blogTag).where(eq(blogTag.id, id))

  await writeAuditLog(db, {
    action: 'blog_tag.delete',
    entityId: id,
    entityType: 'blog_tag',
    metadata: { name: existing.name },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Series ──────────────────────────────────────────────────────────

blogApp.get('/series', async (c) => {
  const { db } = c.get('services')
  const series = await db
    .select({
      coverImageUrl: blogSeries.coverImageUrl,
      description: blogSeries.description,
      id: blogSeries.id,
      name: blogSeries.name,
      postCount: sql<number>`(select count(*) from ${blogPostSeries} where ${blogPostSeries.seriesId} = ${blogSeries.id})`,
      slug: blogSeries.slug,
    })
    .from(blogSeries)
    .orderBy(blogSeries.name)
  return c.json({ series })
})

blogApp.post('/series', withRateLimit('blog-mutate'), validate(createSeriesSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')

  const existing = await db
    .select({ id: blogSeries.id })
    .from(blogSeries)
    .where(eq(blogSeries.slug, parsed.slug))
    .get()
  if (existing) throw new ConflictError('Series slug already exists')

  const id = uuid()
  await db.insert(blogSeries).values({
    coverImageUrl: toNullable(parsed.coverImageUrl),
    description: toNullable(parsed.description),
    id,
    name: parsed.name,
    slug: parsed.slug,
  })

  await writeAuditLog(db, {
    action: 'blog_series.create',
    entityId: id,
    entityType: 'blog_series',
    metadata: { name: parsed.name, slug: parsed.slug },
    userId: currentUser.id,
  })

  return c.json({ id }, 201)
})

blogApp.patch(
  '/series/:id',
  withRateLimit('blog-mutate'),
  validate(updateSeriesSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const id = c.req.param('id')

    const existing = await db.select().from(blogSeries).where(eq(blogSeries.id, id)).get()
    if (!existing) throw new NotFoundError()

    const updates: Partial<typeof blogSeries.$inferInsert> = { updatedAt: new Date() }
    if (parsed.name !== undefined) updates.name = parsed.name
    if (parsed.description !== undefined) updates.description = parsed.description
    if (parsed.coverImageUrl !== undefined) updates.coverImageUrl = parsed.coverImageUrl
    if (parsed.slug !== undefined && parsed.slug !== existing.slug) {
      const slugConflict = await db
        .select({ id: blogSeries.id })
        .from(blogSeries)
        .where(eq(blogSeries.slug, parsed.slug))
        .get()
      if (slugConflict) throw new ConflictError('Series slug already exists')
      updates.slug = parsed.slug
    }

    await db.update(blogSeries).set(updates).where(eq(blogSeries.id, id))

    await writeAuditLog(db, {
      action: 'blog_series.update',
      entityId: id,
      entityType: 'blog_series',
      metadata: { name: existing.name, slug: existing.slug },
      userId: currentUser.id,
    })

    return c.json({ success: true })
  }
)

blogApp.delete('/series/:id', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db
    .select({ name: blogSeries.name })
    .from(blogSeries)
    .where(eq(blogSeries.id, id))
    .get()
  if (!existing) throw new NotFoundError()

  await db.delete(blogPostSeries).where(eq(blogPostSeries.seriesId, id))
  await db.delete(blogSeries).where(eq(blogSeries.id, id))

  await writeAuditLog(db, {
    action: 'blog_series.delete',
    entityId: id,
    entityType: 'blog_series',
    metadata: { name: existing.name },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

blogApp.get('/:id', async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const post = await db.select().from(blogPost).where(eq(blogPost.id, id)).get()
  if (!post) {
    throw new NotFoundError()
  }
  return c.json({ post })
})

blogApp.patch('/:id', withRateLimit('blog-mutate'), validate(updatePostSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db.select().from(blogPost).where(eq(blogPost.id, id)).get()
  if (!existing) {
    throw new NotFoundError()
  }

  const data = parsed
  const updates: Partial<typeof blogPost.$inferInsert> = { updatedAt: new Date() }
  if (data.title !== undefined) updates.title = data.title
  if (data.excerpt !== undefined) updates.excerpt = data.excerpt
  if (data.contentBody !== undefined) updates.contentBody = data.contentBody
  if (data.coverImageUrl !== undefined) updates.coverImageUrl = data.coverImageUrl
  if (data.seoTitle !== undefined) updates.seoTitle = data.seoTitle
  if (data.seoDescription !== undefined) updates.seoDescription = data.seoDescription
  if (data.status !== undefined) updates.status = data.status
  if (data.canonicalUrl !== undefined) updates.canonicalUrl = data.canonicalUrl
  if (data.ogImageUrl !== undefined) updates.ogImageUrl = data.ogImageUrl
  if (data.scheduledAt !== undefined) updates.scheduledAt = data.scheduledAt as Date | null

  if (data.slug !== undefined && data.slug !== existing.slug) {
    await db.insert(blogPostSlugHistory).values({ id: uuid(), oldSlug: existing.slug, postId: id })
    updates.slug = data.slug
  }

  if (data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = new Date()
  }

  if (data.status === 'scheduled' && data.scheduledAt) {
    updates.scheduledAt = data.scheduledAt as Date
  }

  await db.update(blogPost).set(updates).where(eq(blogPost.id, id))

  if (data.contentBody !== undefined || data.title !== undefined) {
    await db.insert(blogPostRevision).values({
      authorId: c.get('user').id,
      changeDescription: data.status === 'published' ? 'Published' : 'Draft save',
      contentBody: (updates.contentBody as string | null) ?? existing.contentBody,
      excerpt: (updates.excerpt as string | null) ?? existing.excerpt,
      id: uuid(),
      postId: id,
      title: (updates.title as string) ?? existing.title,
    })
  }

  if (existing.status === 'published' || updates.status === 'published') {
    await c.get('services').cache.purgeBlog((updates.slug as string) ?? existing.slug)
  }

  if (data.tagIds !== undefined) {
    await db.delete(blogPostTag).where(eq(blogPostTag.postId, id))
    if (data.tagIds.length > 0) {
      await db.insert(blogPostTag).values(data.tagIds.map((tagId) => ({ postId: id, tagId })))
    }
  }

  if (data.seriesIds !== undefined) {
    await db.delete(blogPostSeries).where(eq(blogPostSeries.postId, id))
    if (data.seriesIds.length > 0) {
      await db
        .insert(blogPostSeries)
        .values(data.seriesIds.map((s) => ({ postId: id, seriesId: s.id, sortOrder: s.sortOrder })))
    }
  }

  await writeAuditLog(db, {
    action: 'blog.update',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug: (updates.slug as string) ?? existing.slug, title: existing.title },
    userId: c.get('user').id,
  })

  indexBlogPost(db, id).catch(() => {})

  return c.json({ success: true })
})

blogApp.delete('/:id', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db.select().from(blogPost).where(eq(blogPost.id, id)).get()
  if (!existing) {
    throw new NotFoundError()
  }

  await db
    .update(blogPost)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

  await writeAuditLog(db, {
    action: 'blog.delete',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug: existing.slug, title: existing.title },
    userId: c.get('user').id,
  })

  deindexEntity(db, id, 'blog_post').catch(() => {})

  return c.json({ success: true })
})

blogApp.post('/:id/publish', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db
    .select({ id: blogPost.id, slug: blogPost.slug })
    .from(blogPost)
    .where(eq(blogPost.id, id))
    .get()
  if (!existing) {
    throw new NotFoundError()
  }

  await db
    .update(blogPost)
    .set({ publishedAt: new Date(), status: 'published', updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

  await writeAuditLog(db, {
    action: 'blog.publish',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug: existing.slug },
    userId: c.get('user').id,
  })

  indexBlogPost(db, id).catch(() => {})

  return c.json({ success: true })
})

blogApp.post('/:id/unpublish', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db
    .select({ id: blogPost.id, slug: blogPost.slug })
    .from(blogPost)
    .where(eq(blogPost.id, id))
    .get()
  if (!existing) {
    throw new NotFoundError()
  }

  await db
    .update(blogPost)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

  await writeAuditLog(db, {
    action: 'blog.unpublish',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug: existing.slug },
    userId: c.get('user').id,
  })

  return c.json({ success: true })
})

blogApp.post('/:id/archive', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db
    .select({ id: blogPost.id, slug: blogPost.slug })
    .from(blogPost)
    .where(eq(blogPost.id, id))
    .get()
  if (!existing) {
    throw new NotFoundError()
  }

  await db
    .update(blogPost)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

  await writeAuditLog(db, {
    action: 'blog.archive',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug: existing.slug },
    userId: c.get('user').id,
  })

  deindexEntity(db, id, 'blog_post').catch(() => {})

  return c.json({ success: true })
})

blogApp.post('/:id/restore', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db
    .select({ id: blogPost.id, slug: blogPost.slug })
    .from(blogPost)
    .where(eq(blogPost.id, id))
    .get()
  if (!existing) {
    throw new NotFoundError()
  }

  await db
    .update(blogPost)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog()

  await writeAuditLog(db, {
    action: 'blog.restore',
    entityId: id,
    entityType: 'blog_post',
    metadata: { slug: existing.slug },
    userId: c.get('user').id,
  })

  indexBlogPost(db, id).catch(() => {})

  return c.json({ success: true })
})

// ── Bulk actions ────────────────────────────────────────────────────

blogApp.post('/bulk-delete', withRateLimit('blog-mutate'), async (c) => {
  const { ids } = (await c.req.json()) as { ids?: string[] }
  if (!ids?.length) throw new BadRequestError('No IDs provided')

  const { db } = c.get('services')
  await db
    .update(blogPost)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(inArray(blogPost.id, ids))

  await c.get('services').cache.purgeBlog()
  return c.json({ deleted: ids.length, success: true })
})

blogApp.post('/bulk-archive', withRateLimit('blog-mutate'), async (c) => {
  const { ids } = (await c.req.json()) as { ids?: string[] }
  if (!ids?.length) throw new BadRequestError('No IDs provided')

  const { db } = c.get('services')
  await db
    .update(blogPost)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(inArray(blogPost.id, ids))

  await c.get('services').cache.purgeBlog()
  return c.json({ archived: ids.length, success: true })
})

// ── Media ───────────────────────────────────────────────────────────

blogApp.delete('/media/:key', withRateLimit('blog-mutate'), async (c) => {
  const key = decodeURIComponent(c.req.param('key'))
  await c.get('services').storage.delete(key)
  return c.json({ success: true })
})

blogApp.get('/:id/revisions', async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  const revisions = await db
    .select({
      authorId: blogPostRevision.authorId,
      changeDescription: blogPostRevision.changeDescription,
      createdAt: blogPostRevision.createdAt,
      id: blogPostRevision.id,
      title: blogPostRevision.title,
    })
    .from(blogPostRevision)
    .where(eq(blogPostRevision.postId, id))
    .orderBy(desc(blogPostRevision.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ revisions })
})

blogApp.post('/:id/revisions/:revId/restore', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const postId = c.req.param('id')
  const revId = c.req.param('revId')
  const currentUser = c.get('user')

  const revision = await db
    .select()
    .from(blogPostRevision)
    .where(and(eq(blogPostRevision.id, revId), eq(blogPostRevision.postId, postId)))
    .get()
  if (!revision) {
    throw new NotFoundError('Revision not found')
  }

  const current = await db.select().from(blogPost).where(eq(blogPost.id, postId)).get()
  if (!current) {
    throw new NotFoundError('Post not found')
  }

  await db.insert(blogPostRevision).values({
    authorId: currentUser.id,
    changeDescription: 'Auto-snapshot before restore',
    contentBody: current.contentBody,
    excerpt: current.excerpt,
    id: uuid(),
    postId,
    title: current.title,
  })

  await db
    .update(blogPost)
    .set({
      contentBody: revision.contentBody,
      excerpt: revision.excerpt,
      title: revision.title,
      updatedAt: new Date(),
    })
    .where(eq(blogPost.id, postId))

  await c.get('services').cache.purgeBlog(current.slug)

  return c.json({ success: true })
})

blogApp.post('/link-preview', withRateLimit('link-preview', 30, 60_000), async (c) => {
  const { url } = (await c.req.json()) as { url?: string }
  if (!url || typeof url !== 'string') {
    throw new BadRequestError('URL required')
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VibekitBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()

    // Check for oEmbed link tag in the HTML
    const oembedHref = extractOembedLink(html)
    if (oembedHref) {
      try {
        const oembedRes = await fetch(oembedHref, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VibekitBot/1.0)' },
          signal: AbortSignal.timeout(5000),
        })
        const oembed = (await oembedRes.json()) as Record<string, unknown>
        const ogTitle = extractMeta(html, 'og:title') || extractTitle(html)
        return c.json({
          description: (oembed.title as string) || extractMeta(html, 'og:description'),
          embedHtml: oembed.html as string | undefined,
          image: (oembed.thumbnail_url as string) || extractMeta(html, 'og:image'),
          siteName: extractMeta(html, 'og:site_name') || (oembed.provider_name as string),
          title: ogTitle || (oembed.title as string),
        })
      } catch {
        // oEmbed fetch failed, fall through to OG scraping
      }
    }

    const ogTitle = extractMeta(html, 'og:title') || extractTitle(html)
    const ogDescription = extractMeta(html, 'og:description')
    const ogImage = extractMeta(html, 'og:image')
    const ogSiteName = extractMeta(html, 'og:site_name')

    return c.json({
      description: ogDescription,
      image: ogImage,
      siteName: ogSiteName,
      title: ogTitle,
    })
  } catch {
    throw new BadRequestError('Failed to fetch URL')
  }
})

function extractMeta(html: string, property: string): string | null {
  const pattern = `<meta\\s+(?:property|name)=["']${property}["']\\s+content=["']([^"']*)["']`
  const match = html.match(new RegExp(pattern, 'i'))
  if (match?.[1]) return match[1]
  const altPattern = `<meta\\s+content=["']([^"']*)["']\\s+(?:property|name)=["']${property}["']`
  const altMatch = html.match(new RegExp(altPattern, 'i'))
  return altMatch?.[1] ?? null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match?.[1]?.trim() ?? null
}

function extractOembedLink(html: string): string | null {
  const jsonPattern = /<link[^>]+type=["']application\/json\+oembed["'][^>]+href=["']([^"']+)["']/i
  const match = html.match(jsonPattern)
  if (match?.[1]) return match[1]
  const altPattern = /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/json\+oembed["']/i
  const altMatch = html.match(altPattern)
  return altMatch?.[1] ?? null
}

blogApp.post('/upload', withRateLimit('blog-upload', 20, 60_000), async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    throw new BadRequestError('No file provided')
  }

  const validationError = validateMediaUpload(file)
  if (validationError) {
    throw new BadRequestError(validationError)
  }

  const key = generateStorageKey(file.name)
  const result = await c.get('services').storage.put(key, file.stream(), {
    contentType: file.type,
  })

  return c.json({ key: result.key, url: result.url }, 201)
})

// ── Admin (admin only) ────────────────────────────────────────────────

const adminApp = new Hono<ProtectedEnv>().use('*', requireAdmin)

const updateSchema = z.object({
  displayName: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
})

// Admin stats
adminApp.get('/stats', async (c) => {
  const { db } = c.get('services')
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    newUsersThisWeek,
    totalPosts,
    publishedPosts,
    draftPosts,
    totalItems,
    activeItems,
    recentAuditLogs,
  ] = await Promise.all([
    db.select({ count: count() }).from(user).where(isNull(user.deletedAt)).get(),
    db
      .select({ count: count() })
      .from(user)
      .where(and(isNull(user.deletedAt), eq(user.status, 'active')))
      .get(),
    db
      .select({ count: count() })
      .from(user)
      .where(and(isNull(user.deletedAt), eq(user.status, 'suspended')))
      .get(),
    db
      .select({ count: count() })
      .from(user)
      .where(and(isNull(user.deletedAt), gte(user.createdAt, oneWeekAgo)))
      .get(),
    db.select({ count: count() }).from(blogPost).get(),
    db.select({ count: count() }).from(blogPost).where(eq(blogPost.status, 'published')).get(),
    db.select({ count: count() }).from(blogPost).where(eq(blogPost.status, 'draft')).get(),
    db.select({ count: count() }).from(item).where(isNull(item.deletedAt)).get(),
    db
      .select({ count: count() })
      .from(item)
      .where(and(eq(item.status, 'active'), isNull(item.deletedAt)))
      .get(),
    db
      .select({
        action: auditLog.action,
        createdAt: auditLog.createdAt,
        entityId: auditLog.entityId,
        entityType: auditLog.entityType,
        id: auditLog.id,
        metadata: auditLog.metadata,
        userId: auditLog.userId,
        userName: user.name,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.userId, user.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
  ])

  return c.json({
    audit: recentAuditLogs.map((log) => ({
      action: log.action,
      createdAt: log.createdAt,
      entityId: log.entityId,
      entityType: log.entityType,
      id: log.id,
      metadata: log.metadata,
      userName: log.userName ?? 'Unknown',
    })),
    items: {
      active: activeItems?.count ?? 0,
      total: totalItems?.count ?? 0,
    },
    posts: {
      draft: draftPosts?.count ?? 0,
      published: publishedPosts?.count ?? 0,
      total: totalPosts?.count ?? 0,
    },
    users: {
      active: activeUsers?.count ?? 0,
      newThisWeek: newUsersThisWeek?.count ?? 0,
      suspended: suspendedUsers?.count ?? 0,
      total: totalUsers?.count ?? 0,
    },
  })
})

adminApp.get('/users', async (c) => {
  const { db } = c.get('services')
  const statusParam = c.req.query('status')
  const search = c.req.query('search')
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 20)))
  const offset = (page - 1) * limit

  const conditions = [isNull(user.deletedAt)]

  if (statusParam === 'active' || statusParam === 'suspended') {
    conditions.push(eq(user.status, statusParam))
  }

  if (search) {
    conditions.push(like(user.email, `%${search}%`))
  }

  const whereClause = and(...conditions)

  const [countResult, users] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause),
    db
      .select({
        createdAt: user.createdAt,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        lastLoginAt: user.lastLoginAt,
        name: user.name,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  return c.json({ total: countResult[0].count, users })
})

adminApp.patch('/users/:id', withRateLimit('users-mutate'), validate(updateSchema), async (c) => {
  const parsed = c.req.valid('json')
  const currentUser = c.get('user')
  const targetId = c.req.param('id')

  const { db } = c.get('services')

  const [existing] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!existing) {
    throw new NotFoundError('User not found')
  }

  type UserUpdate = Partial<Pick<typeof user.$inferInsert, 'role' | 'status' | 'displayName'>> & {
    updatedAt?: SQL
  }
  interface AuditMetadata {
    oldRole?: string | null
    newRole?: string | null
    oldStatus?: string | null
    newStatus?: string | null
    oldDisplayName?: string | null
    newDisplayName?: string | null
  }
  const updates: UserUpdate = {}
  const auditMetadata: AuditMetadata = {}

  if (parsed.role !== undefined && parsed.role !== existing.role) {
    updates.role = parsed.role
    auditMetadata.oldRole = existing.role
    auditMetadata.newRole = parsed.role
  }

  if (parsed.status !== undefined && parsed.status !== existing.status) {
    updates.status = parsed.status
    auditMetadata.oldStatus = existing.status
    auditMetadata.newStatus = parsed.status
  }

  if (parsed.displayName !== undefined) {
    updates.displayName = parsed.displayName
    auditMetadata.oldDisplayName = existing.displayName
    auditMetadata.newDisplayName = parsed.displayName
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError('No changes provided')
  }

  updates.updatedAt = sql`(cast(unixepoch('subsecond') * 1000 as integer))`

  const [updated] = await db.update(user).set(updates).where(eq(user.id, targetId)).returning({
    createdAt: user.createdAt,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    image: user.image,
    lastLoginAt: user.lastLoginAt,
    name: user.name,
    role: user.role,
    status: user.status,
    updatedAt: user.updatedAt,
  })

  await writeAuditLog(db, {
    action: 'user.update',
    entityId: targetId,
    entityType: 'user',
    metadata: auditMetadata,
    userId: currentUser.id,
  })

  // Revoke all sessions when user is suspended
  if (updates.status === 'suspended') {
    await db.delete(sessionTable).where(eq(sessionTable.userId, targetId))
  }

  return c.json({ user: updated })
})

// ── Admin Ban/Unban ──────────────────────────────────────────────────

adminApp.post('/users/:id/ban', withRateLimit('users-mutate'), async (c) => {
  const currentUser = c.get('user')
  const targetId = c.req.param('id')
  const body = await c.req.json<{ reason?: string; durationDays?: number }>()

  if (!body.reason?.trim()) {
    throw new BadRequestError('Ban reason is required')
  }

  const { db } = c.get('services')
  const [target] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!target) {
    throw new NotFoundError('User not found')
  }
  if (target.id === currentUser.id) {
    throw new BadRequestError('Cannot ban yourself')
  }
  if (target.status === 'suspended') {
    throw new BadRequestError('User is already suspended')
  }

  const banExpiresAt = body.durationDays
    ? new Date(Date.now() + body.durationDays * 24 * 60 * 60 * 1000)
    : null

  await db
    .update(user)
    .set({
      banExpiresAt,
      banReason: body.reason.trim(),
      status: 'suspended',
    })
    .where(eq(user.id, targetId))

  await db.delete(sessionTable).where(eq(sessionTable.userId, targetId))

  await writeAuditLog(db, {
    action: 'user.ban',
    entityId: targetId,
    entityType: 'user',
    metadata: {
      banExpiresAt: banExpiresAt?.toISOString() ?? null,
      durationDays: body.durationDays ?? null,
      reason: body.reason.trim(),
      targetEmail: target.email,
      targetName: target.name,
    },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

adminApp.post('/users/:id/unban', withRateLimit('users-mutate'), async (c) => {
  const currentUser = c.get('user')
  const targetId = c.req.param('id')

  const { db } = c.get('services')
  const [target] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!target) {
    throw new NotFoundError('User not found')
  }
  if (target.status !== 'suspended') {
    throw new BadRequestError('User is not suspended')
  }

  await db
    .update(user)
    .set({
      banExpiresAt: null,
      banReason: null,
      status: 'active',
    })
    .where(eq(user.id, targetId))

  await writeAuditLog(db, {
    action: 'user.unban',
    entityId: targetId,
    entityType: 'user',
    metadata: { targetEmail: target.email, targetName: target.name },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

adminApp.delete('/users/:id', withRateLimit('users-mutate'), async (c) => {
  const currentUser = c.get('user')
  const targetId = c.req.param('id')

  if (targetId === currentUser.id) {
    throw new BadRequestError('Cannot delete yourself')
  }

  const { db } = c.get('services')

  const [existing] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!existing) {
    throw new NotFoundError('User not found')
  }

  await db
    .update(user)
    .set({ deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))` })
    .where(eq(user.id, targetId))

  await db.delete(sessionTable).where(eq(sessionTable.userId, targetId))

  await writeAuditLog(db, {
    action: 'user.delete',
    entityId: targetId,
    entityType: 'user',
    metadata: { deletedUserEmail: existing.email, deletedUserName: existing.name },
    userId: currentUser.id,
  })

  return new Response(null, { status: 204 })
})

// ── Admin Upload ─────────────────────────────────────────────────────

adminApp.post('/upload', withRateLimit('upload', 10, 60_000), async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    throw new BadRequestError('No file provided')
  }

  const validationError = validateImageUpload(file)
  if (validationError) {
    throw new BadRequestError(validationError)
  }

  const key = generateStorageKey(file.name)
  const result = await c.get('services').storage.put(key, file.stream(), {
    contentType: file.type,
  })

  return c.json({ key: result.key, url: result.url }, 201)
})

// ── Admin Impersonation ──────────────────────────────────────────────

adminApp.post('/users/:id/impersonate', withRateLimit('impersonate', 5, 60_000), async (c) => {
  const currentUser = c.get('user')
  const targetId = c.req.param('id')
  const body = await c.req.json<{ reason?: string }>()

  if (!body.reason?.trim()) {
    throw new BadRequestError('Reason is required for impersonation')
  }

  const { db } = c.get('services')

  const [target] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!target) {
    throw new NotFoundError('User not found')
  }

  if (target.id === currentUser.id) {
    throw new BadRequestError('Cannot impersonate yourself')
  }

  if (target.role === 'admin') {
    throw new ForbiddenError('Cannot impersonate other admins')
  }

  const sessionToken = uuid()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour max

  await db.insert(sessionTable).values({
    expiresAt,
    id: uuid(),
    token: sessionToken,
    userId: target.id,
  })

  const impersonationId = uuid()
  await db.insert(impersonationSession).values({
    adminUserId: currentUser.id,
    id: impersonationId,
    reason: body.reason.trim(),
    sessionToken,
    targetUserId: target.id,
  })

  await writeAuditLog(db, {
    action: 'user.impersonate_start',
    entityId: impersonationId,
    entityType: 'impersonation_session',
    metadata: {
      impersonationId,
      reason: body.reason.trim(),
      targetEmail: target.email,
      targetName: target.name,
      targetUserId: target.id,
    },
    userId: currentUser.id,
  })

  return c.json({
    sessionToken,
    targetUser: {
      email: target.email,
      id: target.id,
      name: target.name,
    },
  })
})

adminApp.post('/users/:id/stop-impersonate', async (c) => {
  const currentUser = c.get('user')
  const body = await c.req.json<{ sessionToken?: string }>()

  if (!body.sessionToken) {
    throw new BadRequestError('Session token is required')
  }

  const { db } = c.get('services')

  const [impSession] = await db
    .select()
    .from(impersonationSession)
    .where(
      and(
        eq(impersonationSession.sessionToken, body.sessionToken),
        eq(impersonationSession.adminUserId, currentUser.id),
        isNull(impersonationSession.endedAt)
      )
    )

  if (!impSession) {
    throw new NotFoundError('Active impersonation session not found')
  }

  await db
    .update(impersonationSession)
    .set({ endedAt: new Date() })
    .where(eq(impersonationSession.id, impSession.id))

  await db.delete(sessionTable).where(eq(sessionTable.token, body.sessionToken))

  await writeAuditLog(db, {
    action: 'user.impersonate_stop',
    entityId: impSession.id,
    entityType: 'impersonation_session',
    metadata: { targetUserId: impSession.targetUserId },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Admin Content Moderation ─────────────────────────────────────────

adminApp.get('/reports', async (c) => {
  const { db } = c.get('services')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
  const offset = (page - 1) * limit
  const statusFilter = c.req.query('status')
  const entityTypeFilter = c.req.query('entityType')

  const conditions: SQL[] = []
  if (
    statusFilter === 'pending' ||
    statusFilter === 'reviewing' ||
    statusFilter === 'resolved' ||
    statusFilter === 'dismissed'
  ) {
    conditions.push(eq(contentReport.status, statusFilter))
  }

  if (
    entityTypeFilter === 'blogPost' ||
    entityTypeFilter === 'contactSubmission' ||
    entityTypeFilter === 'item' ||
    entityTypeFilter === 'organization' ||
    entityTypeFilter === 'team' ||
    entityTypeFilter === 'user'
  ) {
    conditions.push(eq(contentReport.entityType, entityTypeFilter))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [countResult, reports] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReport)
      .where(whereClause),
    db
      .select({
        createdAt: contentReport.createdAt,
        description: contentReport.description,
        entityId: contentReport.entityId,
        entityType: contentReport.entityType,
        id: contentReport.id,
        reason: contentReport.reason,
        reporterEmail: user.email,
        reporterName: user.name,
        resolutionNote: contentReport.resolutionNote,
        resolvedAt: contentReport.resolvedAt,
        resolvedBy: contentReport.resolvedBy,
        status: contentReport.status,
      })
      .from(contentReport)
      .leftJoin(user, eq(contentReport.reporterId, user.id))
      .where(whereClause)
      .orderBy(desc(contentReport.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  // Resolve resolver names for resolved reports
  const resolvedBy = reports.map((r) => r.resolvedBy).filter((id): id is string => id !== null)
  const resolverIds = [...new Set(resolvedBy)]

  const resolverMap = new Map<string, { email: string | null; name: string | null }>()
  if (resolverIds.length > 0) {
    const resolvers = await db
      .select({ email: user.email, id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, resolverIds))
    for (const r of resolvers) {
      resolverMap.set(r.id, { email: r.email, name: r.name })
    }
  }

  const enrichedReports = reports.map((r) => {
    const resolver = r.resolvedBy ? resolverMap.get(r.resolvedBy) : null
    return {
      createdAt: r.createdAt,
      description: r.description,
      entityId: r.entityId,
      entityType: r.entityType,
      id: r.id,
      reason: r.reason,
      reporterEmail: r.reporterEmail,
      reporterName: r.reporterName,
      resolutionNote: r.resolutionNote,
      resolvedAt: r.resolvedAt,
      resolverEmail: resolver?.email ?? null,
      resolverName: resolver?.name ?? null,
      status: r.status,
    }
  })

  return c.json({ limit, page, reports: enrichedReports, total: countResult[0]?.count ?? 0 })
})

adminApp.get('/reports/stats', async (c) => {
  const { db } = c.get('services')

  const [pending, reviewing, resolved, dismissed, total] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReport)
      .where(eq(contentReport.status, 'pending'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReport)
      .where(eq(contentReport.status, 'reviewing'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReport)
      .where(eq(contentReport.status, 'resolved'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReport)
      .where(eq(contentReport.status, 'dismissed'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentReport)
      .get(),
  ])

  return c.json({
    dismissed: dismissed?.count ?? 0,
    pending: pending?.count ?? 0,
    resolved: resolved?.count ?? 0,
    reviewing: reviewing?.count ?? 0,
    total: total?.count ?? 0,
  })
})

adminApp.patch('/reports/:id', validate(resolveReportSchema), async (c) => {
  const parsed = c.req.valid('json')
  const currentUser = c.get('user')
  const reportId = c.req.param('id')
  const { db } = c.get('services')

  const [existing] = await db.select().from(contentReport).where(eq(contentReport.id, reportId))

  if (!existing) {
    throw new NotFoundError('Report not found')
  }

  if (existing.status === 'resolved' || existing.status === 'dismissed') {
    throw new BadRequestError('Report is already resolved')
  }

  await db
    .update(contentReport)
    .set({
      resolutionNote: parsed.resolutionNote,
      resolvedAt: new Date(),
      resolvedBy: currentUser.id,
      status: parsed.status,
    })
    .where(eq(contentReport.id, reportId))

  await writeAuditLog(db, {
    action: `content.report_${parsed.status}`,
    entityId: reportId,
    entityType: 'content_report',
    metadata: {
      reportedEntityId: existing.entityId,
      reportedEntityType: existing.entityType,
      resolutionNote: parsed.resolutionNote,
      status: parsed.status,
    },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Admin Cleanup ────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

app.post('/api/admin/cleanup', async (c) => {
  const cronSecret = c.req.header('x-cron-secret')
  const currentUser = c.get('user')
  const isCron = cronSecret && cronSecret === c.get('services').env.cronSecret

  if (!isCron && (!currentUser || currentUser.role !== 'admin')) {
    throw new ForbiddenError()
  }

  const { db } = c.get('services')
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS)

  const deletedPosts = await db
    .delete(blogPost)
    .where(and(isNotNull(blogPost.deletedAt), lt(blogPost.deletedAt, cutoff)))
    .returning({ id: blogPost.id })

  const deletedItems = await db
    .delete(item)
    .where(and(isNotNull(item.deletedAt), lt(item.deletedAt, cutoff)))
    .returning({ id: item.id })

  const deletedUsers = await db
    .delete(user)
    .where(and(isNotNull(user.deletedAt), lt(user.deletedAt, cutoff)))
    .returning({ id: user.id })

  const deletedOrgs = await db
    .delete(organization)
    .where(and(isNotNull(organization.deletedAt), lt(organization.deletedAt, cutoff)))
    .returning({ id: organization.id })

  // Auto-expire temporary bans
  const expiredBans = await db
    .update(user)
    .set({ banExpiresAt: null, banReason: null, status: 'active' })
    .where(
      and(
        eq(user.status, 'suspended'),
        isNotNull(user.banExpiresAt),
        lt(user.banExpiresAt, new Date())
      )
    )
    .returning({ id: user.id, name: user.name })

  await Promise.all(
    expiredBans.map((unbanned) =>
      writeAuditLog(db, {
        action: 'user.unban',
        entityId: unbanned.id,
        entityType: 'user',
        metadata: { reason: 'auto_expired' },
        userId: 'system',
      })
    )
  )

  return c.json({
    cutoff: cutoff.toISOString(),
    expiredBans: expiredBans.length,
    purged: {
      items: deletedItems.length,
      organizations: deletedOrgs.length,
      posts: deletedPosts.length,
      users: deletedUsers.length,
    },
  })
})

// ── Scheduled Publishing ──────────────────────────────────────────────

app.post('/api/admin/publish-scheduled', async (c) => {
  const cronSecret = c.req.header('x-cron-secret')
  const currentUser = c.get('user')
  const isCron = cronSecret && cronSecret === c.get('services').env.cronSecret

  if (!isCron && (!currentUser || currentUser.role !== 'admin')) {
    throw new ForbiddenError()
  }

  const { db } = c.get('services')
  const now = new Date()

  const due = await db
    .select({ id: blogPost.id, slug: blogPost.slug, title: blogPost.title })
    .from(blogPost)
    .where(
      and(
        eq(blogPost.status, 'scheduled'),
        isNull(blogPost.deletedAt),
        isNotNull(blogPost.scheduledAt),
        lte(blogPost.scheduledAt, now)
      )
    )

  if (due.length === 0) {
    return c.json({ published: 0 })
  }

  const ids = due.map((p) => p.id)

  await db
    .update(blogPost)
    .set({ publishedAt: now, scheduledAt: null, status: 'published', updatedAt: now })
    .where(and(eq(blogPost.status, 'scheduled'), inArray(blogPost.id, ids)))

  await Promise.all([
    ...due.map((post) => c.get('services').cache.purgeBlog(post.slug)),
    ...due.map((post) =>
      writeAuditLog(db, {
        action: 'blog.publish',
        entityId: post.id,
        entityType: 'blog_post',
        metadata: { reason: 'scheduled', slug: post.slug, title: post.title },
        userId: 'system',
      })
    ),
  ])

  return c.json({ posts: due.map((p) => p.slug), published: due.length })
})

// ── Organizations (auth required) ─────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const orgApp = new Hono<OrgEnv>().use('*', requireUser)

// List user's organizations
orgApp.get('/', async (c) => {
  const { db } = c.get('services')
  const { id: userId } = c.get('user')

  const memberships = await db
    .select({
      description: organization.description,
      id: organization.id,
      name: organization.name,
      ownerId: organization.ownerId,
      role: organizationMember.role,
      slug: organization.slug,
    })
    .from(organizationMember)
    .innerJoin(organization, eq(organizationMember.organizationId, organization.id))
    .where(and(eq(organizationMember.userId, userId), isNull(organization.deletedAt)))
    .orderBy(desc(organization.createdAt))

  return c.json({ organizations: memberships })
})

// Create organization
orgApp.post('/', validate(createOrganizationSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')

  const slug = generateSlug(parsed.name)

  const existing = await db
    .select({ id: organization.id })
    .from(organization)
    .where(and(eq(organization.slug, slug), isNull(organization.deletedAt)))
    .get()

  if (existing) {
    throw new ConflictError('Organization slug already exists')
  }

  const id = uuid()
  await db.insert(organization).values({
    description: parsed.description ?? null,
    id,
    name: parsed.name,
    ownerId: currentUser.id,
    slug,
  })

  await db.insert(organizationMember).values({
    joinedAt: new Date(),
    organizationId: id,
    role: 'owner',
    userId: currentUser.id,
  })

  await writeAuditLog(db, {
    action: 'organization.create',
    entityId: id,
    entityType: 'organization',
    metadata: { name: parsed.name, slug },
    userId: currentUser.id,
  })

  return c.json({ id, name: parsed.name, slug }, 201)
})

// Get org details
orgApp.get('/:orgId', withOrgMembership, requirePermission('org.read'), async (c) => {
  const org = c.get('organization' as never) as typeof organization.$inferSelect
  const membership = c.get('membership' as never) as typeof organizationMember.$inferSelect

  return c.json({
    membership: {
      id: membership.id,
      joinedAt: membership.joinedAt,
      role: membership.role,
    },
    organization: {
      createdAt: org.createdAt,
      description: org.description,
      id: org.id,
      name: org.name,
      ownerId: org.ownerId,
      slug: org.slug,
      updatedAt: org.updatedAt,
    },
  })
})

// Update org
orgApp.patch(
  '/:orgId',
  withOrgMembership,
  requirePermission('org.update'),
  validate(updateOrganizationSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const org = c.get('organization' as never) as typeof organization.$inferSelect

    const newSlug = generateSlug(parsed.name)
    if (newSlug !== org.slug) {
      const existing = await db
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.slug, newSlug), isNull(organization.deletedAt)))
        .get()
      if (existing) {
        throw new ConflictError('Organization slug already exists')
      }
    }

    await db
      .update(organization)
      .set({
        description: parsed.description ?? null,
        name: parsed.name,
        slug: newSlug,
        updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      })
      .where(eq(organization.id, org.id))

    await writeAuditLog(db, {
      action: 'organization.update',
      entityId: org.id,
      entityType: 'organization',
      metadata: { name: parsed.name, slug: newSlug },
      userId: currentUser.id,
    })

    return c.json({ success: true })
  }
)

// Soft-delete org
orgApp.delete('/:orgId', withOrgMembership, requirePermission('org.delete'), async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const org = c.get('organization' as never) as typeof organization.$inferSelect

  await db
    .update(organization)
    .set({
      deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
    })
    .where(eq(organization.id, org.id))

  await writeAuditLog(db, {
    action: 'organization.delete',
    entityId: org.id,
    entityType: 'organization',
    metadata: { name: org.name },
    userId: currentUser.id,
  })

  return new Response(null, { status: 204 })
})

// List members
orgApp.get(
  '/:orgId/members',
  withOrgMembership,
  requirePermission('org.members.read'),
  async (c) => {
    const { db } = c.get('services')
    const org = c.get('organization' as never) as typeof organization.$inferSelect

    const members = await db
      .select({
        email: user.email,
        id: organizationMember.id,
        image: user.image,
        joinedAt: organizationMember.joinedAt,
        name: user.name,
        role: organizationMember.role,
        userId: user.id,
      })
      .from(organizationMember)
      .innerJoin(user, eq(organizationMember.userId, user.id))
      .where(and(eq(organizationMember.organizationId, org.id), isNull(user.deletedAt)))
      .orderBy(asc(organizationMember.joinedAt))

    return c.json({ members })
  }
)

// Change member role
orgApp.patch(
  '/:orgId/members/:memberId',
  withOrgMembership,
  requirePermission('org.members.manage'),
  validate(updateMemberRoleSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const org = c.get('organization' as never) as typeof organization.$inferSelect
    const memberId = c.req.param('memberId')

    const [targetMember] = await db
      .select()
      .from(organizationMember)
      .where(
        and(eq(organizationMember.id, memberId), eq(organizationMember.organizationId, org.id))
      )

    if (!targetMember) {
      throw new NotFoundError('Member not found')
    }

    if (targetMember.role === 'owner') {
      throw new ForbiddenError('Cannot change owner role. Use ownership transfer instead.')
    }

    if (parsed.role === 'owner') {
      throw new ForbiddenError('Cannot assign owner role. Use ownership transfer instead.')
    }

    await db
      .update(organizationMember)
      .set({ role: parsed.role })
      .where(eq(organizationMember.id, memberId))

    await writeAuditLog(db, {
      action: 'organization.member.update_role',
      entityId: memberId,
      entityType: 'organization_member',
      metadata: { newRole: parsed.role, oldRole: targetMember.role, organizationId: org.id },
      userId: currentUser.id,
    })

    await createNotification(db, {
      body: `Your role in "${org.name}" was changed from ${targetMember.role} to ${parsed.role}`,
      entityId: org.id,
      entityType: 'organization',
      title: 'Role updated',
      type: 'info',
      userId: targetMember.userId,
    })

    return c.json({ success: true })
  }
)

// Remove member
orgApp.delete(
  '/:orgId/members/:memberId',
  withOrgMembership,
  requirePermission('org.members.remove'),
  async (c) => {
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const org = c.get('organization' as never) as typeof organization.$inferSelect
    const memberId = c.req.param('memberId')

    const [targetMember] = await db
      .select()
      .from(organizationMember)
      .where(
        and(eq(organizationMember.id, memberId), eq(organizationMember.organizationId, org.id))
      )

    if (!targetMember) {
      throw new NotFoundError('Member not found')
    }

    if (targetMember.role === 'owner') {
      throw new ForbiddenError('Cannot remove the organization owner')
    }

    if (targetMember.userId === currentUser.id) {
      throw new BadRequestError('Cannot remove yourself. Leave the organization instead.')
    }

    await db.delete(organizationMember).where(eq(organizationMember.id, memberId))

    await writeAuditLog(db, {
      action: 'organization.member.remove',
      entityId: memberId,
      entityType: 'organization_member',
      metadata: { organizationId: org.id, removedUserId: targetMember.userId },
      userId: currentUser.id,
    })

    await createNotification(db, {
      body: `You were removed from "${org.name}"`,
      entityId: org.id,
      entityType: 'organization',
      title: 'Removed from organization',
      type: 'warning',
      userId: targetMember.userId,
    })

    return c.json({ success: true })
  }
)

// Invite member
orgApp.post(
  '/:orgId/members/invite',
  withOrgMembership,
  requirePermission('org.members.invite'),
  validate(inviteMemberSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const org = c.get('organization' as never) as typeof organization.$inferSelect

    const [existingMember] = await db
      .select({ id: organizationMember.id })
      .from(organizationMember)
      .innerJoin(user, eq(organizationMember.userId, user.id))
      .where(
        and(
          eq(organizationMember.organizationId, org.id),
          eq(user.email, parsed.email),
          isNull(user.deletedAt)
        )
      )

    if (existingMember) {
      throw new ConflictError('User is already a member of this organization')
    }

    const pendingInvite = await db
      .select({ id: organizationInvitation.id })
      .from(organizationInvitation)
      .where(
        and(
          eq(organizationInvitation.organizationId, org.id),
          eq(organizationInvitation.email, parsed.email),
          isNull(organizationInvitation.acceptedAt),
          gt(organizationInvitation.expiresAt, new Date())
        )
      )
      .get()

    if (pendingInvite) {
      throw new ConflictError('An active invitation already exists for this email')
    }

    const token = uuid()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(organizationInvitation).values({
      email: parsed.email,
      expiresAt,
      invitedBy: currentUser.id,
      organizationId: org.id,
      role: parsed.role,
      token,
    })

    await writeAuditLog(db, {
      action: 'organization.invite',
      entityId: token,
      entityType: 'organization_invitation',
      metadata: { email: parsed.email, organizationId: org.id, role: parsed.role },
      userId: currentUser.id,
    })

    return c.json({ expiresAt, token }, 201)
  }
)

// Transfer ownership
orgApp.post(
  '/:orgId/transfer-ownership',
  withOrgMembership,
  requirePermission('org.transfer'),
  validate(transferOwnershipSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const org = c.get('organization' as never) as typeof organization.$inferSelect

    const [newOwnerMember] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.userId, parsed.newOwnerId),
          eq(organizationMember.organizationId, org.id)
        )
      )

    if (!newOwnerMember) {
      throw new NotFoundError('Target user is not a member of this organization')
    }

    if (newOwnerMember.userId === currentUser.id) {
      throw new BadRequestError('Cannot transfer ownership to yourself')
    }

    await db
      .update(organizationMember)
      .set({ role: 'admin' })
      .where(
        and(
          eq(organizationMember.userId, currentUser.id),
          eq(organizationMember.organizationId, org.id)
        )
      )

    await db
      .update(organizationMember)
      .set({ role: 'owner' })
      .where(eq(organizationMember.id, newOwnerMember.id))

    await db
      .update(organization)
      .set({
        ownerId: parsed.newOwnerId,
        updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      })
      .where(eq(organization.id, org.id))

    await writeAuditLog(db, {
      action: 'organization.transfer_ownership',
      entityId: org.id,
      entityType: 'organization',
      metadata: { newOwnerId: parsed.newOwnerId, previousOwnerId: currentUser.id },
      userId: currentUser.id,
    })

    await createNotification(db, {
      body: `Ownership of "${org.name}" was transferred to you`,
      entityId: org.id,
      entityType: 'organization',
      title: 'Organization ownership transferred',
      type: 'success',
      userId: parsed.newOwnerId,
    })

    return c.json({ success: true })
  }
)

// ── Org Billing ───────────────────────────────────────────────────────

orgApp.get(
  '/:orgId/billing/subscription',
  withOrgMembership,
  requirePermission('org.read'),
  async (c) => {
    const org = c.get('organization' as never) as typeof organization.$inferSelect
    const { db } = c.get('services')
    const sub = await getOrgSubscription(db, org.id)
    return c.json({ subscription: sub })
  }
)

orgApp.post(
  '/:orgId/billing/checkout',
  withOrgMembership,
  requirePermission('org.update'),
  async (c) => {
    const org = c.get('organization' as never) as typeof organization.$inferSelect
    const user = c.get('user')
    const body = await c.req.json<{ cancelUrl: string; planId: string; successUrl: string }>()
    const { db } = c.get('services')

    const plan = await getPlanById(db, body.planId)
    if (!plan) throw new NotFoundError()

    const sub = await createSubscription(db, {
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      organizationId: org.id,
      planId: plan.id,
      trialEnd:
        plan.trialDays > 0
          ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
          : undefined,
      userId: user.id,
    })

    return c.json({ subscription: sub })
  }
)

orgApp.post(
  '/:orgId/billing/change-plan',
  withOrgMembership,
  requirePermission('org.update'),
  async (c) => {
    const org = c.get('organization' as never) as typeof organization.$inferSelect
    const body = await c.req.json<{ newPlanId: string }>()
    const { db } = c.get('services')

    const sub = await getOrgSubscription(db, org.id)
    if (!sub) throw new BadRequestError('No active subscription')

    const newPlan = await getPlanById(db, body.newPlanId)
    if (!newPlan) throw new NotFoundError()

    await changeSubscriptionPlan(db, sub.id, body.newPlanId)
    return c.json({ success: true })
  }
)

orgApp.get(
  '/:orgId/billing/invoices',
  withOrgMembership,
  requirePermission('org.read'),
  async (c) => {
    const org = c.get('organization' as never) as typeof organization.$inferSelect
    const { db } = c.get('services')

    const invoices = await db
      .select()
      .from(invoice)
      .where(eq(invoice.organizationId, org.id))
      .orderBy(desc(invoice.createdAt))

    return c.json({ invoices })
  }
)

// ── Teams (within organizations) ──────────────────────────────────────

const teamApp = new Hono<TeamEnv>().use('*', requireUser)

// List teams in org
teamApp.get('/', withOrgMembership, requirePermission('org.read'), async (c) => {
  const { db } = c.get('services')
  const org = c.get('organization' as never) as { id: string }

  const teams = await db
    .select({
      createdAt: team.createdAt,
      description: team.description,
      id: team.id,
      name: team.name,
      updatedAt: team.updatedAt,
    })
    .from(team)
    .where(and(eq(team.organizationId, org.id), isNull(team.deletedAt)))
    .orderBy(desc(team.createdAt))

  return c.json({ teams })
})

// Create team
teamApp.post(
  '/',
  withOrgMembership,
  requirePermission('org.update'),
  withRateLimit('team-mutate', 20),
  validate(createTeamSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const org = c.get('organization' as never) as { id: string }

    const id = uuid()
    await db.insert(team).values({
      description: parsed.description ?? null,
      id,
      name: parsed.name,
      organizationId: org.id,
    })

    await db.insert(teamMember).values({
      role: 'lead',
      teamId: id,
      userId: currentUser.id,
    })

    await writeAuditLog(db, {
      action: 'team.create',
      entityId: id,
      entityType: 'team',
      metadata: { name: parsed.name, organizationId: org.id },
      userId: currentUser.id,
    })

    return c.json({ id, name: parsed.name }, 201)
  }
)

// Get team details
teamApp.get(
  '/:teamId',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.read'),
  async (c) => {
    const teamRow = c.get('team' as never) as typeof team.$inferSelect
    const teamMembershipRow = c.get('teamMembership' as never) as {
      id: string
      joinedAt: Date
      role: string
      teamId: string
      userId: string
    } | null

    return c.json({
      team: {
        createdAt: teamRow.createdAt,
        description: teamRow.description,
        id: teamRow.id,
        name: teamRow.name,
        organizationId: teamRow.organizationId,
        updatedAt: teamRow.updatedAt,
      },
      teamMembership: teamMembershipRow
        ? {
            id: teamMembershipRow.id,
            joinedAt: teamMembershipRow.joinedAt,
            role: teamMembershipRow.role,
          }
        : null,
    })
  }
)

// Update team
teamApp.patch(
  '/:teamId',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.update'),
  withRateLimit('team-mutate'),
  validate(updateTeamSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const teamRow = c.get('team' as never) as { id: string }

    await db
      .update(team)
      .set({
        description: parsed.description ?? null,
        name: parsed.name,
        updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      })
      .where(eq(team.id, teamRow.id))

    await writeAuditLog(db, {
      action: 'team.update',
      entityId: teamRow.id,
      entityType: 'team',
      metadata: { name: parsed.name },
      userId: currentUser.id,
    })

    return c.json({ success: true })
  }
)

// Soft-delete team
teamApp.delete(
  '/:teamId',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.delete'),
  withRateLimit('team-mutate'),
  async (c) => {
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const teamRow = c.get('team' as never) as { id: string; name: string }

    await db
      .update(team)
      .set({
        deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
        updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
      })
      .where(eq(team.id, teamRow.id))

    await writeAuditLog(db, {
      action: 'team.delete',
      entityId: teamRow.id,
      entityType: 'team',
      metadata: { name: teamRow.name },
      userId: currentUser.id,
    })

    return new Response(null, { status: 204 })
  }
)

// List team members
teamApp.get(
  '/:teamId/members',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.members.read'),
  async (c) => {
    const { db } = c.get('services')
    const teamRow = c.get('team' as never) as { id: string }

    const members = await db
      .select({
        email: user.email,
        id: teamMember.id,
        joinedAt: teamMember.joinedAt,
        name: user.name,
        role: teamMember.role,
        userId: user.id,
      })
      .from(teamMember)
      .innerJoin(user, eq(teamMember.userId, user.id))
      .where(and(eq(teamMember.teamId, teamRow.id), isNull(user.deletedAt)))
      .orderBy(asc(teamMember.joinedAt))

    return c.json({ members })
  }
)

// Add member to team
teamApp.post(
  '/:teamId/members',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.members.add'),
  withRateLimit('team-mutate'),
  validate(addTeamMemberSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const teamRow = c.get('team' as never) as { id: string }
    const org = c.get('organization' as never) as { id: string }

    const [existingMember] = await db
      .select({ id: organizationMember.id })
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.userId, parsed.userId),
          eq(organizationMember.organizationId, org.id)
        )
      )

    if (!existingMember) {
      throw new ForbiddenError('User is not a member of this organization')
    }

    const existingTeamMember = await db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamRow.id), eq(teamMember.userId, parsed.userId)))
      .get()

    if (existingTeamMember) {
      throw new ConflictError('User is already a member of this team')
    }

    const id = uuid()
    await db.insert(teamMember).values({
      id,
      role: parsed.role,
      teamId: teamRow.id,
      userId: parsed.userId,
    })

    await writeAuditLog(db, {
      action: 'team.member.add',
      entityId: id,
      entityType: 'team_member',
      metadata: { teamId: teamRow.id, teamRole: parsed.role, userId: parsed.userId },
      userId: currentUser.id,
    })

    return c.json({ id }, 201)
  }
)

// Change team member role
teamApp.patch(
  '/:teamId/members/:memberId',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.members.manage'),
  validate(updateTeamMemberRoleSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const teamRow = c.get('team' as never) as { id: string }
    const memberId = c.req.param('memberId')

    const [targetMember] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.id, memberId), eq(teamMember.teamId, teamRow.id)))

    if (!targetMember) {
      throw new NotFoundError('Team member not found')
    }

    await db.update(teamMember).set({ role: parsed.role }).where(eq(teamMember.id, memberId))

    await writeAuditLog(db, {
      action: 'team.member.update_role',
      entityId: memberId,
      entityType: 'team_member',
      metadata: { newRole: parsed.role, oldRole: targetMember.role, teamId: teamRow.id },
      userId: currentUser.id,
    })

    return c.json({ success: true })
  }
)

// Remove team member
teamApp.delete(
  '/:teamId/members/:memberId',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.members.manage'),
  async (c) => {
    const { db } = c.get('services')
    const currentUser = c.get('user')
    const teamRow = c.get('team' as never) as { id: string }
    const memberId = c.req.param('memberId')

    const [targetMember] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.id, memberId), eq(teamMember.teamId, teamRow.id)))

    if (!targetMember) {
      throw new NotFoundError('Team member not found')
    }

    if (targetMember.userId === currentUser.id) {
      throw new BadRequestError('Cannot remove yourself from the team')
    }

    await db.delete(teamMember).where(eq(teamMember.id, memberId))

    await writeAuditLog(db, {
      action: 'team.member.remove',
      entityId: memberId,
      entityType: 'team_member',
      metadata: { removedUserId: targetMember.userId, teamId: teamRow.id },
      userId: currentUser.id,
    })

    return c.json({ success: true })
  }
)

// Team activity feed
teamApp.get(
  '/:teamId/activity',
  withOrgMembership,
  withTeamMembership,
  requireTeamPermission('team.read'),
  async (c) => {
    const { db } = c.get('services')
    const teamRow = c.get('team' as never) as { id: string }
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = 50
    const offset = (page - 1) * limit

    const [activities, totalResult] = await Promise.all([
      db
        .select({
          action: teamActivity.action,
          actorName: user.name,
          createdAt: teamActivity.createdAt,
          entityId: teamActivity.entityId,
          entityType: teamActivity.entityType,
          id: teamActivity.id,
          metadata: teamActivity.metadata,
        })
        .from(teamActivity)
        .leftJoin(user, eq(teamActivity.actorId, user.id))
        .where(eq(teamActivity.teamId, teamRow.id))
        .orderBy(desc(teamActivity.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(teamActivity).where(eq(teamActivity.teamId, teamRow.id)),
    ])

    const totalPages = Math.ceil((totalResult[0]?.count ?? 0) / limit)

    return c.json({ activities, page, totalPages })
  }
)

// ── Invitations (auth required, no org context) ──────────────────────

protectedApp.get('/invitations', async (c) => {
  const { db } = c.get('services')
  const { email } = c.get('user')

  if (!email) return c.json({ invitations: [] })

  const invitations = await db
    .select({
      createdAt: organizationInvitation.createdAt,
      email: organizationInvitation.email,
      expiresAt: organizationInvitation.expiresAt,
      id: organizationInvitation.id,
      organizationId: organizationInvitation.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      role: organizationInvitation.role,
      token: organizationInvitation.token,
    })
    .from(organizationInvitation)
    .innerJoin(organization, eq(organizationInvitation.organizationId, organization.id))
    .where(
      and(
        eq(organizationInvitation.email, email),
        isNull(organizationInvitation.acceptedAt),
        gt(organizationInvitation.expiresAt, new Date()),
        isNull(organization.deletedAt)
      )
    )
    .orderBy(desc(organizationInvitation.createdAt))

  return c.json({ invitations })
})

protectedApp.post('/invitations/:token/accept', async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const token = c.req.param('token')

  const [invitation] = await db
    .select()
    .from(organizationInvitation)
    .where(eq(organizationInvitation.token, token))

  if (!invitation) {
    throw new NotFoundError('Invitation not found')
  }

  if (invitation.acceptedAt) {
    throw new ConflictError('Invitation already accepted')
  }

  if (invitation.expiresAt < new Date()) {
    throw new BadRequestError('Invitation has expired')
  }

  if (invitation.email !== currentUser.email) {
    throw new ForbiddenError('This invitation is not for your email address')
  }

  const existingMember = await db
    .select({ id: organizationMember.id })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, invitation.organizationId),
        eq(organizationMember.userId, currentUser.id)
      )
    )
    .get()

  if (existingMember) {
    throw new ConflictError('You are already a member of this organization')
  }

  await db.insert(organizationMember).values({
    joinedAt: new Date(),
    organizationId: invitation.organizationId,
    role: invitation.role,
    userId: currentUser.id,
  })

  await db
    .update(organizationInvitation)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvitation.id, invitation.id))

  await writeAuditLog(db, {
    action: 'organization.accept_invitation',
    entityId: invitation.id,
    entityType: 'organization_invitation',
    metadata: { organizationId: invitation.organizationId, role: invitation.role },
    userId: currentUser.id,
  })

  // Notify the inviter
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, invitation.organizationId))
    .limit(1)

  if (org) {
    await createNotification(db, {
      body: `${currentUser.name ?? currentUser.email} accepted your invitation to join "${org.name}"`,
      entityId: invitation.organizationId,
      entityType: 'organization',
      title: 'Invitation accepted',
      type: 'success',
      userId: invitation.invitedBy,
    })
  }

  return c.json({ organizationId: invitation.organizationId, success: true })
})

protectedApp.post('/invitations/:token/decline', async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const token = c.req.param('token')

  const [invitation] = await db
    .select()
    .from(organizationInvitation)
    .where(eq(organizationInvitation.token, token))

  if (!invitation) {
    throw new NotFoundError('Invitation not found')
  }

  if (invitation.acceptedAt) {
    throw new ConflictError('Invitation already accepted')
  }

  if (invitation.email !== currentUser.email) {
    throw new ForbiddenError('This invitation is not for your email address')
  }

  await db
    .update(organizationInvitation)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvitation.id, invitation.id))

  return c.json({ success: true })
})

// ── System Configuration ────────────────────────────────────────────

/* eslint-disable sort-keys */
const CONFIG_DEFAULTS: Record<
  string,
  { description: string; type: 'boolean' | 'json' | 'string'; value: string }
> = {
  blog_comments_enabled: {
    description: 'Enable commenting on blog posts',
    type: 'boolean',
    value: 'false',
  },
  file_upload_max_mb: {
    description: 'Maximum file upload size in MB',
    type: 'string',
    value: '10',
  },
  maintenance_mode: {
    description: 'Enable maintenance mode (blocks non-admin access)',
    type: 'boolean',
    value: 'false',
  },
  maintenance_message: {
    description: 'Message displayed during maintenance mode',
    type: 'string',
    value: 'We are performing scheduled maintenance. Please check back soon.',
  },
  registration_enabled: {
    description: 'Allow new user registration',
    type: 'boolean',
    value: 'true',
  },
}
/* eslint-enable sort-keys */

// Public: active announcements
app.get('/api/announcements', async (c) => {
  const services = c.get('services')
  if (!services) return c.json([])
  const { db } = services

  const rows = await db
    .select({
      createdAt: announcement.createdAt,
      endsAt: announcement.endsAt,
      id: announcement.id,
      message: announcement.message,
      startsAt: announcement.startsAt,
      type: announcement.type,
    })
    .from(announcement)
    .where(
      and(
        eq(announcement.isActive, true),
        sql`(starts_at IS NULL OR starts_at <= unixepoch('subsecond') * 1000)`,
        sql`(ends_at IS NULL OR ends_at >= unixepoch('subsecond') * 1000)`
      )
    )
    .orderBy(desc(announcement.createdAt))

  return c.json(rows)
})

// Admin: list all config entries
adminApp.get('/config', async (c) => {
  const { db } = c.get('services')
  const rows = await db.select().from(systemConfig)

  const configMap = new Map(rows.map((r) => [r.key, r]))
  const allConfigs = Object.entries(CONFIG_DEFAULTS).map(([key, def]) => {
    const row = configMap.get(key)
    return {
      createdAt: row?.createdAt ?? null,
      description: row?.description ?? def.description,
      id: row?.id ?? key,
      key,
      type: row?.type ?? def.type,
      updatedAt: row?.updatedAt ?? null,
      value: row?.value ?? def.value,
    }
  })

  return c.json(allConfigs)
})

// Admin: update config value
adminApp.patch(
  '/config/:key',
  withRateLimit('config', 20, 60_000),
  validate(updateConfigSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const configKey = c.req.param('key')
    const currentUser = c.get('user')
    const { db } = c.get('services')

    const def = CONFIG_DEFAULTS[configKey]
    if (!def) {
      throw new BadRequestError(`Unknown config key: ${configKey}`)
    }

    // Validate value matches type
    if (def.type === 'boolean' && parsed.value !== 'true' && parsed.value !== 'false') {
      throw new BadRequestError('Boolean config requires "true" or "false"')
    }

    const existing = await db
      .select({ id: systemConfig.id })
      .from(systemConfig)
      .where(eq(systemConfig.key, configKey))

    if (existing.length > 0) {
      await db
        .update(systemConfig)
        .set({ updatedBy: currentUser.id, value: parsed.value })
        .where(eq(systemConfig.key, configKey))
    } else {
      // eslint-disable-next-line unicorn/prefer-ternary
      await db.insert(systemConfig).values({
        description: def.description,
        id: uuid(),
        key: configKey,
        type: def.type,
        updatedBy: currentUser.id,
        value: parsed.value,
      })
    }

    await writeAuditLog(db, {
      action: 'config.update',
      entityId: configKey,
      entityType: 'system_config',
      metadata: { key: configKey, newValue: parsed.value },
      userId: currentUser.id,
    })

    return c.json({ key: configKey, value: parsed.value })
  }
)

// Admin: config version history
adminApp.get('/config/history', async (c) => {
  const { db } = c.get('services')
  const key = c.req.query('key') ?? undefined
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '50')))
  const offset = Math.max(0, Number(c.req.query('offset') ?? '0'))
  const versions = await getConfigHistory(db, key, { limit, offset })
  return c.json({ versions })
})

// Admin: resolve config for environment
adminApp.post('/config/resolve', async (c) => {
  const { db } = c.get('services')
  const body = await c.req.json<{ environment?: string; keys: string[] }>()
  const resolved = await resolveConfig(db, body.keys, body.environment)
  return c.json(resolved)
})

// Admin: list announcements
adminApp.get('/announcements', async (c) => {
  const { db } = c.get('services')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  const [countResult, rows] = await Promise.all([
    db.select({ count: count() }).from(announcement),
    db
      .select({
        createdAt: announcement.createdAt,
        createdBy: announcement.createdBy,
        endsAt: announcement.endsAt,
        id: announcement.id,
        isActive: announcement.isActive,
        message: announcement.message,
        startsAt: announcement.startsAt,
        type: announcement.type,
        updatedAt: announcement.updatedAt,
      })
      .from(announcement)
      .orderBy(desc(announcement.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  return c.json({ announcements: rows, limit, page, total: countResult[0]?.count ?? 0 })
})

// Admin: create announcement
adminApp.post(
  '/announcements',
  withRateLimit('announcement', 10, 60_000),
  validate(createAnnouncementSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const currentUser = c.get('user')
    const { db } = c.get('services')
    const id = uuid()

    await db.insert(announcement).values({
      createdBy: currentUser.id,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      id,
      isActive: parsed.isActive ?? true,
      message: parsed.message,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      type: parsed.type,
    })

    await writeAuditLog(db, {
      action: 'announcement.create',
      entityId: id,
      entityType: 'announcement',
      metadata: { message: parsed.message.slice(0, 100), type: parsed.type },
      userId: currentUser.id,
    })

    return c.json({ id }, 201)
  }
)

// Admin: update announcement
adminApp.patch(
  '/announcements/:id',
  withRateLimit('announcement', 20, 60_000),
  validate(updateAnnouncementSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const announcementId = c.req.param('id')
    const currentUser = c.get('user')
    const { db } = c.get('services')

    const [existing] = await db
      .select({ id: announcement.id })
      .from(announcement)
      .where(eq(announcement.id, announcementId))
    if (!existing) throw new NotFoundError('Announcement not found')

    const updates: Record<string, unknown> = {}
    if (parsed.message !== undefined) updates.message = parsed.message
    if (parsed.type !== undefined) updates.type = parsed.type
    if (parsed.isActive !== undefined) updates.isActive = parsed.isActive
    if (parsed.startsAt !== undefined) {
      updates.startsAt = parsed.startsAt ? new Date(parsed.startsAt) : null
    }
    if (parsed.endsAt !== undefined) {
      updates.endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null
    }

    await db.update(announcement).set(updates).where(eq(announcement.id, announcementId))

    await writeAuditLog(db, {
      action: 'announcement.update',
      entityId: announcementId,
      entityType: 'announcement',
      metadata: { isActive: parsed.isActive, updates: Object.keys(updates) },
      userId: currentUser.id,
    })

    return c.json({ id: announcementId })
  }
)

// Admin: delete announcement
adminApp.delete('/announcements/:id', withRateLimit('announcement', 10, 60_000), async (c) => {
  const announcementId = c.req.param('id')
  const currentUser = c.get('user')
  const { db } = c.get('services')

  const [existing] = await db
    .select({ id: announcement.id })
    .from(announcement)
    .where(eq(announcement.id, announcementId))
  if (!existing) throw new NotFoundError('Announcement not found')

  await db.delete(announcement).where(eq(announcement.id, announcementId))

  await writeAuditLog(db, {
    action: 'announcement.delete',
    entityId: announcementId,
    entityType: 'announcement',
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Newsletter Admin (admin only) ──────────────────────────────────────

adminApp.get('/newsletter/subscribers', async (c) => {
  const { db } = c.get('services')
  const statusFilter = c.req.query('status') as
    | 'confirmed'
    | 'pending'
    | 'unsubscribed'
    | 'bounced'
    | undefined
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '25')))
  const offset = (page - 1) * limit

  const conditions = statusFilter ? eq(newsletterSubscriber.status, statusFilter) : undefined

  const [subscribers, totalResult] = await Promise.all([
    db
      .select()
      .from(newsletterSubscriber)
      .where(conditions)
      .orderBy(desc(newsletterSubscriber.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterSubscriber)
      .where(conditions)
      .get(),
  ])

  return c.json({
    page,
    subscribers,
    total: totalResult?.count ?? 0,
  })
})

adminApp.get('/newsletter/stats', async (c) => {
  const { db } = c.get('services')
  const [pending, confirmed, unsubscribed, bounced] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, 'pending'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, 'confirmed'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, 'unsubscribed'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.status, 'bounced'))
      .get(),
  ])
  return c.json({
    bounced: bounced?.count ?? 0,
    confirmed: confirmed?.count ?? 0,
    pending: pending?.count ?? 0,
    unsubscribed: unsubscribed?.count ?? 0,
  })
})

adminApp.delete('/newsletter/subscribers/:id', async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db
    .select()
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.id, id))
    .get()
  if (!existing) throw new NotFoundError()

  await db.delete(newsletterSubscriber).where(eq(newsletterSubscriber.id, id))

  await writeAuditLog(db, {
    action: 'newsletter.subscriber_delete',
    entityId: id,
    entityType: 'newsletter_subscriber',
    metadata: { email: existing.email, originalStatus: existing.status },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Post Analytics (admin only) ──────────────────────────────────────────

adminApp.get('/analytics/overview', async (c) => {
  const { db } = c.get('services')
  const days = parseInt(c.req.query('days') ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalViews, uniqueVisitors, completedReads, topPosts, referrers] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogPostView)
      .where(gte(blogPostView.createdAt, since))
      .get(),
    db
      .select({ count: sql<number>`count(distinct ${blogPostView.visitorHash})` })
      .from(blogPostView)
      .where(gte(blogPostView.createdAt, since))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogPostView)
      .where(and(gte(blogPostView.createdAt, since), eq(blogPostView.isCompleted, true)))
      .get(),
    db
      .select({
        slug: blogPost.slug,
        title: blogPost.title,
        views: sql<number>`count(${blogPostView.id})`,
      })
      .from(blogPostView)
      .innerJoin(blogPost, eq(blogPostView.postId, blogPost.id))
      .where(gte(blogPostView.createdAt, since))
      .groupBy(blogPost.id, blogPost.slug, blogPost.title)
      .orderBy(sql`count(${blogPostView.id}) desc`)
      .limit(10),
    db
      .select({
        count: sql<number>`count(*)`,
        domain: blogPostView.referrerDomain,
      })
      .from(blogPostView)
      .where(and(gte(blogPostView.createdAt, since), isNotNull(blogPostView.referrerDomain)))
      .groupBy(blogPostView.referrerDomain)
      .orderBy(sql`count(*) desc`)
      .limit(10),
  ])

  const avgCompletion = totalViews?.count
    ? Math.round(((completedReads?.count ?? 0) / totalViews.count) * 100)
    : 0

  return c.json({
    avgCompletion,
    referrers,
    topPosts,
    totalViews: totalViews?.count ?? 0,
    uniqueVisitors: uniqueVisitors?.count ?? 0,
  })
})

adminApp.get('/analytics/posts/:postId', async (c) => {
  const { db } = c.get('services')
  const postId = c.req.param('postId')
  const days = parseInt(c.req.query('days') ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [views, uniqueVisitors, completedReads, avgReadTime, dailyViews] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogPostView)
      .where(and(eq(blogPostView.postId, postId), gte(blogPostView.createdAt, since)))
      .get(),
    db
      .select({ count: sql<number>`count(distinct ${blogPostView.visitorHash})` })
      .from(blogPostView)
      .where(and(eq(blogPostView.postId, postId), gte(blogPostView.createdAt, since)))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(blogPostView)
      .where(
        and(
          eq(blogPostView.postId, postId),
          gte(blogPostView.createdAt, since),
          eq(blogPostView.isCompleted, true)
        )
      )
      .get(),
    db
      .select({
        avg: sql<number>`cast(avg(${blogPostView.readTime}) as integer)`,
      })
      .from(blogPostView)
      .where(
        and(
          eq(blogPostView.postId, postId),
          gte(blogPostView.createdAt, since),
          isNotNull(blogPostView.readTime)
        )
      )
      .get(),
    db
      .select({
        count: sql<number>`count(*)`,
        date: sql<string>`date(${blogPostView.createdAt} / 1000, 'unixepoch')`,
      })
      .from(blogPostView)
      .where(and(eq(blogPostView.postId, postId), gte(blogPostView.createdAt, since)))
      .groupBy(sql`date(${blogPostView.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${blogPostView.createdAt} / 1000, 'unixepoch')`),
  ])

  const completionRate = views?.count
    ? Math.round(((completedReads?.count ?? 0) / views.count) * 100)
    : 0

  return c.json({
    avgReadTime: avgReadTime?.avg ?? 0,
    completionRate,
    dailyViews,
    totalViews: views?.count ?? 0,
    uniqueVisitors: uniqueVisitors?.count ?? 0,
  })
})

// ── Comment Moderation (admin only) ────────────────────────────────────

adminApp.get('/comments', async (c) => {
  const { db } = c.get('services')
  const statusFilter = c.req.query('status') as
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'spam'
    | undefined
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '25')))
  const offset = (page - 1) * limit

  const conditions = statusFilter ? eq(comment.status, statusFilter) : undefined

  const [comments, totalResult] = await Promise.all([
    db
      .select({
        authorEmail: user.email,
        authorName: user.name,
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        moderatedAt: comment.moderatedAt,
        postId: comment.postId,
        postTitle: blogPost.title,
        spamReason: comment.spamReason,
        spamScore: comment.spamScore,
        status: comment.status,
      })
      .from(comment)
      .innerJoin(user, eq(comment.authorId, user.id))
      .leftJoin(blogPost, eq(comment.postId, blogPost.id))
      .where(conditions)
      .orderBy(desc(comment.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comment)
      .where(conditions)
      .get(),
  ])

  return c.json({
    comments,
    page,
    total: totalResult?.count ?? 0,
  })
})

adminApp.get('/comments/stats', async (c) => {
  const { db } = c.get('services')
  const [pending, spam, approved, rejected] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(comment)
      .where(eq(comment.status, 'pending'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comment)
      .where(eq(comment.status, 'spam'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comment)
      .where(eq(comment.status, 'approved'))
      .get(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comment)
      .where(eq(comment.status, 'rejected'))
      .get(),
  ])
  return c.json({
    approved: approved?.count ?? 0,
    pending: pending?.count ?? 0,
    rejected: rejected?.count ?? 0,
    spam: spam?.count ?? 0,
  })
})

adminApp.patch('/comments/:id/moderate', validate(moderateCommentSchema), async (c) => {
  const parsed = c.req.valid('json')
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db.select().from(comment).where(eq(comment.id, id)).get()
  if (!existing) throw new NotFoundError()

  await db
    .update(comment)
    .set({
      moderatedAt: new Date(),
      moderatedBy: currentUser.id,
      status: parsed.status,
      updatedAt: new Date(),
    })
    .where(eq(comment.id, id))

  await writeAuditLog(db, {
    action: 'comment.moderate',
    entityId: id,
    entityType: 'comment',
    metadata: { from: existing.status, to: parsed.status },
    userId: currentUser.id,
  })

  // Notify comment author
  if (parsed.status === 'approved') {
    await createNotification(db, {
      body: 'Your comment has been approved',
      entityId: id,
      entityType: 'comment',
      title: 'Comment approved',
      type: 'success',
      userId: existing.authorId,
    })
  }

  return c.json({ success: true })
})

adminApp.delete('/comments/:id', async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const id = c.req.param('id')

  const existing = await db.select().from(comment).where(eq(comment.id, id)).get()
  if (!existing) throw new NotFoundError()

  await db.delete(comment).where(eq(comment.id, id))

  await writeAuditLog(db, {
    action: 'comment.admin_delete',
    entityId: id,
    entityType: 'comment',
    metadata: { originalStatus: existing.status, postId: existing.postId },
    userId: currentUser.id,
  })

  return c.json({ success: true })
})

// ── Admin Broadcasts ──────────────────────────────────────────────────

adminApp.post('/notifications/broadcast', withRateLimit('broadcast', 5, 60_000), async (c) => {
  const { db } = c.get('services')
  const currentUser = c.get('user')
  const body = await c.req.json<{
    body?: string
    link?: string
    target: 'admins' | 'all'
    title: string
    type?: 'error' | 'info' | 'success' | 'warning'
  }>()

  if (!body.title?.trim()) {
    throw new BadRequestError('title is required')
  }

  if (body.target !== 'all' && body.target !== 'admins') {
    throw new BadRequestError('target must be "all" or "admins"')
  }

  const getUserIds = async (target: 'admins' | 'all') => {
    const conditions = [isNull(user.deletedAt)]
    if (target === 'admins') {
      conditions.push(eq(user.role, 'admin'))
    }
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(and(...conditions))
    return rows.map((r) => r.id)
  }

  const count = await createBroadcast(
    db,
    {
      body: body.body,
      link: body.link,
      target: body.target,
      title: body.title.trim(),
      type: body.type,
    },
    getUserIds
  )

  await writeAuditLog(db, {
    action: 'notification.broadcast',
    entityId: 'broadcast',
    entityType: 'notification',
    metadata: {
      body: body.body,
      recipientCount: count,
      target: body.target,
      title: body.title.trim(),
    },
    userId: currentUser.id,
  })

  return c.json({ count, success: true }, 201)
})

// ── Admin Billing ────────────────────────────────────────────────────

adminApp.get('/billing/plans', async (c) => {
  const { db } = c.get('services')
  const plans = await getAllPlans(db)
  return c.json({ plans })
})

adminApp.post('/billing/plans', validate(createPlanSchema), async (c) => {
  const { db } = c.get('services')
  const parsed = c.req.valid('json')
  const plan = await createPlan(db, parsed)
  return c.json({ plan }, 201)
})

adminApp.patch('/billing/plans/:id', validate(updatePlanSchema), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')
  const parsed = c.req.valid('json')

  const existing = await getPlanById(db, id)
  if (!existing) throw new NotFoundError()

  const plan = await updatePlan(db, id, parsed)
  return c.json({ plan })
})

adminApp.delete('/billing/plans/:id', async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await getPlanById(db, id)
  if (!existing) throw new NotFoundError()

  await deactivatePlan(db, id)
  return c.json({ success: true })
})

adminApp.get('/billing/overview', async (c) => {
  const { db } = c.get('services')
  const overview = await getBillingOverview(db)
  return c.json(overview)
})

adminApp.get('/billing/invoices', async (c) => {
  const { db } = c.get('services')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
  const offset = (page - 1) * limit

  const invoices = await db
    .select()
    .from(invoice)
    .orderBy(desc(invoice.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ invoices, limit, page })
})

adminApp.get('/webhooks/deliveries', async (c) => {
  const { db } = c.get('services')
  const eventType = c.req.query('eventType')
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '50')))
  const status = c.req.query('status')

  const deliveries = await listAllDeliveries(db, {
    eventType: eventType ?? undefined,
    limit,
    status: status ?? undefined,
  })
  return c.json({ deliveries })
})

adminApp.post('/webhooks/:deliveryId/retry', async (c) => {
  const { db } = c.get('services')
  const deliveryId = c.req.param('deliveryId')
  const result = await retryWebhookDelivery(db, deliveryId)
  if (!result) throw new NotFoundError()
  return c.json(result)
})

// Admin integration routes
adminApp.get('/integrations', async (c) => {
  const { db } = c.get('services')
  const query = c.req.query()
  const integrations = await listAllIntegrations(db, {
    limit: Math.min(Number(query.limit ?? '50'), 100),
    provider: query.provider,
    status: query.status,
  })
  return c.json({ integrations })
})

adminApp.post('/integrations/:id/health', async (c) => {
  const { db } = c.get('services')
  const integrationId = c.req.param('id')
  const result = await checkIntegrationHealth(db, integrationId)
  if (!result) throw new NotFoundError()
  return c.json(result)
})

// ── Admin Feature Flags ────────────────────────────────────────────────

adminApp.get('/feature-flags', async (c) => {
  const { db } = c.get('services')
  const rawOpts = c.req.query()
  const parsed = listFeatureFlagsSchema.safeParse(rawOpts)
  const options = parsed.success ? parsed.data : undefined
  const flags = await listFeatureFlags(db, options)
  return c.json({ flags })
})

adminApp.post('/feature-flags', validate(createFeatureFlagSchema), async (c) => {
  const { db } = c.get('services')
  const input = c.req.valid('json')
  const flag = await createFeatureFlag(db, input)
  return c.json(flag, 201)
})

adminApp.get('/feature-flags/:key', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const flag = await getFeatureFlag(db, key)
  if (!flag) throw new NotFoundError()
  return c.json(flag)
})

adminApp.patch('/feature-flags/:key', validate(updateFeatureFlagSchema), async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const input = c.req.valid('json')
  const flag = await updateFeatureFlag(db, key, input)
  if (!flag) throw new NotFoundError()
  return c.json(flag)
})

adminApp.delete('/feature-flags/:key', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  await deleteFeatureFlag(db, key)
  return c.json({ deleted: true, key })
})

adminApp.post('/feature-flags/:key/toggle', validate(toggleFeatureFlagSchema), async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const { enabled } = c.req.valid('json')
  const flag = await toggleFeatureFlag(db, key, enabled)
  if (!flag) throw new NotFoundError()
  return c.json(flag)
})

adminApp.post('/feature-flags/:key/kill-switch', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const flag = await activateKillSwitch(db, key)
  if (!flag) throw new NotFoundError()
  return c.json(flag)
})

// ── Admin A/B Testing ────────────────────────────────────────────────

adminApp.get('/experiments', async (c) => {
  const { db } = c.get('services')
  const rawOpts = c.req.query()
  const parsed = listExperimentsSchema.safeParse(rawOpts)
  const options = parsed.success ? parsed.data : undefined
  const experiments = await listExperiments(db, options)
  return c.json({ experiments })
})

adminApp.post('/experiments', validate(createExperimentSchema), async (c) => {
  const { db } = c.get('services')
  const input = c.req.valid('json')
  const experiment = await createExperiment(db, input)
  return c.json(experiment, 201)
})

adminApp.get('/experiments/:key', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const experiment = await getExperiment(db, key)
  if (!experiment) throw new NotFoundError()
  const variants = await getExperimentVariants(db, experiment.id as string)
  return c.json({ ...experiment, variants })
})

adminApp.patch('/experiments/:key', validate(updateExperimentSchema), async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const input = c.req.valid('json')
  const result = await updateExperiment(db, key, {
    ...input,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
  })
  if (!result) throw new NotFoundError()
  return c.json(result)
})

adminApp.delete('/experiments/:key', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  await deleteExperiment(db, key)
  return c.json({ deleted: true, key })
})

adminApp.get('/experiments/:key/results', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const results = await getExperimentResults(db, key)
  return c.json({ results })
})

adminApp.get('/experiments/:key/variants', async (c) => {
  const { db } = c.get('services')
  const key = c.req.param('key')
  const experiment = await getExperiment(db, key)
  if (!experiment) throw new NotFoundError()
  const variants = await getExperimentVariants(db, experiment.id as string)
  return c.json({ variants })
})

// ── Admin Media Library ──────────────────────────────────────────────

adminApp.get('/media', async (c) => {
  const services = c.get('services')
  const prefix = c.req.query('prefix') || undefined
  const cursor = c.req.query('cursor') || undefined
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)))
  const type = c.req.query('type') // image, video, audio, document

  const result = await services.storage.list(prefix, cursor, limit)

  if (type) {
    const mimeMap: Record<string, string[]> = {
      audio: ['audio/'],
      document: ['application/pdf', 'text/', 'application/msword', 'application/vnd.'],
      image: ['image/'],
      video: ['video/'],
    }
    const prefixes = mimeMap[type] ?? []
    result.items = result.items.filter(
      (item: { contentType?: string }) =>
        item.contentType && prefixes.some((p) => item.contentType!.startsWith(p))
    )
  }

  return c.json(result)
})

adminApp.post('/media/upload', withRateLimit('upload', 10, 60_000), async (c) => {
  const services = c.get('services')
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) throw new BadRequestError('No file provided')

  const validationError = validateMediaUpload(file)
  if (validationError) throw new BadRequestError(validationError)

  const key = generateStorageKey(file.name)
  const arrayBuffer = await file.arrayBuffer()
  const body = new Uint8Array(arrayBuffer)

  const result = await services.storage.put(key, body, {
    cacheControl: 'public, max-age=31536000',
    contentType: file.type,
  })

  return c.json(result, 201)
})

adminApp.post('/media/bulk-delete', async (c) => {
  const services = c.get('services')
  const { keys } = await c.req.json<{ keys: string[] }>()
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > 100) {
    throw new BadRequestError('Must provide 1-100 keys')
  }
  for (const key of keys) {
    await services.storage.delete(key)
  }
  return c.json({ deleted: keys.length })
})

// ── Admin Search Index ────────────────────────────────────────────────

adminApp.post('/search/index', validate(indexDocumentSchema), async (c) => {
  const { db } = c.get('services')
  const input = c.req.valid('json')
  const adapter = createD1SearchAdapter(db)
  const searchService = createSearchService(adapter)
  await searchService.indexEntity(input)
  return c.json({ indexed: true })
})

adminApp.delete('/search/index', async (c) => {
  const { db } = c.get('services')
  const body = await c.req.json<{ entityId: string; entityType: string }>()
  const adapter = createD1SearchAdapter(db)
  const searchService = createSearchService(adapter)
  await searchService.deleteEntity(body.entityId, body.entityType)
  return c.json({ deleted: true })
})

adminApp.post('/search/reindex', async (c) => {
  const { db } = c.get('services')
  const [blogCount, itemCount] = await Promise.all([reindexAllBlogPosts(db), reindexAllItems(db)])
  return c.json({ blogPosts: blogCount, items: itemCount })
})

// ── Mount sub-apps ───────────────────────────────────────────────────

const routes = app
  .route('/api', protectedApp)
  .route('/api/blog', blogApp)
  .route('/api/admin', adminApp)
  .route('/api/orgs', orgApp)
  .route('/api/orgs/:orgId/teams', teamApp)

export type AppType = typeof routes
export { app }
