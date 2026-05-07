import { writeAuditLog } from '$lib/server/audit'
import { blogPost, blogPostSlugHistory, item, user } from '$lib/server/db/schema'
import { generateStorageKey, validateImageUpload } from '$lib/server/upload'
import { uuid } from '$lib/server/uuid'
import {
  createItemSchema,
  createPostSchema,
  updateItemSchema,
  updatePostSchema,
} from '$lib/validators'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, isNotNull, isNull, like, lt, sql, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { z } from 'zod/v4'

import {
  withOwnedItem,
  withRateLimit,
  requireAdmin,
  requireUser,
  withServices,
  withSession,
} from './middleware'
import type { ProtectedEnv } from './types'

const app = new Hono()
  .use('*', secureHeaders(), withServices, withSession)
  .on(['POST', 'GET'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw))
  .onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal Server Error' }, 500)
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

// ── Items (auth required) ────────────────────────────────────────────

const protectedApp = new Hono<ProtectedEnv>().use('*', requireUser)

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

protectedApp.post('/items', zValidator('json', createItemSchema), async (c) => {
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

protectedApp.patch('/items/:id', withOwnedItem, zValidator('json', updateItemSchema), async (c) => {
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

  return new Response(null, { status: 204 })
})

// ── Blog (admin only) ────────────────────────────────────────────────

const blogApp = new Hono<ProtectedEnv>().use('*', requireAdmin)

const toNullable = (v: string | undefined | null) => v ?? null

blogApp.get('/', async (c) => {
  const { db } = c.get('services')
  const rawStatus = c.req.query('status') ?? ''
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = 20
  const offset = (page - 1) * limit
  const validStatuses = ['draft', 'published', 'archived'] as const
  const isTrash = rawStatus === 'trash'
  const filterStatus = validStatuses.includes(rawStatus as (typeof validStatuses)[number])
    ? (rawStatus as (typeof validStatuses)[number])
    : null

  let whereClause: ReturnType<typeof isNull>
  if (isTrash) {
    whereClause = isNotNull(blogPost.deletedAt)
  } else if (filterStatus) {
    whereClause = and(eq(blogPost.status, filterStatus), isNull(blogPost.deletedAt))!
  } else {
    whereClause = isNull(blogPost.deletedAt)
  }

  const posts = await db
    .select({
      createdAt: blogPost.createdAt,
      deletedAt: blogPost.deletedAt,
      id: blogPost.id,
      publishedAt: blogPost.publishedAt,
      slug: blogPost.slug,
      status: blogPost.status,
      title: blogPost.title,
      updatedAt: blogPost.updatedAt,
    })
    .from(blogPost)
    .where(whereClause)
    .orderBy(desc(blogPost.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ posts })
})

blogApp.post(
  '/',
  withRateLimit('blog-mutate', 50),
  zValidator('json', createPostSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const currentUser = c.get('user')

    const existing = await db
      .select({ id: blogPost.id })
      .from(blogPost)
      .where(eq(blogPost.slug, parsed.slug))
      .get()

    if (existing) {
      return c.json({ error: 'Slug already exists' }, 409)
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

    return c.json({ id }, 201)
  }
)

blogApp.get('/:id', async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const post = await db.select().from(blogPost).where(eq(blogPost.id, id)).get()
  if (!post) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ post })
})

blogApp.patch(
  '/:id',
  withRateLimit('blog-mutate'),
  zValidator('json', updatePostSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const { db } = c.get('services')
    const id = c.req.param('id')

    const existing = await db.select().from(blogPost).where(eq(blogPost.id, id)).get()
    if (!existing) {
      return c.json({ error: 'Not found' }, 404)
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

    if (data.slug !== undefined && data.slug !== existing.slug) {
      await db
        .insert(blogPostSlugHistory)
        .values({ id: uuid(), oldSlug: existing.slug, postId: id })
      updates.slug = data.slug
    }

    if (data.status === 'published' && !existing.publishedAt) {
      updates.publishedAt = new Date()
    }

    await db.update(blogPost).set(updates).where(eq(blogPost.id, id))

    if (existing.status === 'published' || updates.status === 'published') {
      await c.get('services').cache.purgeBlog((updates.slug as string) ?? existing.slug)
    }

    return c.json({ success: true })
  }
)

blogApp.delete('/:id', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  const id = c.req.param('id')

  const existing = await db.select().from(blogPost).where(eq(blogPost.id, id)).get()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db
    .update(blogPost)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

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
    return c.json({ error: 'Not found' }, 404)
  }

  await db
    .update(blogPost)
    .set({ publishedAt: new Date(), status: 'published', updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

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
    return c.json({ error: 'Not found' }, 404)
  }

  await db
    .update(blogPost)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

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
    return c.json({ error: 'Not found' }, 404)
  }

  await db
    .update(blogPost)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog(existing.slug)

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
    return c.json({ error: 'Not found' }, 404)
  }

  await db
    .update(blogPost)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(blogPost.id, id))

  await c.get('services').cache.purgeBlog()

  return c.json({ success: true })
})

// ── Admin (admin only) ────────────────────────────────────────────────

const adminApp = new Hono<ProtectedEnv>().use('*', requireAdmin)

const updateSchema = z.object({
  displayName: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
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

adminApp.patch(
  '/users/:id',
  withRateLimit('users-mutate'),
  zValidator('json', updateSchema),
  async (c) => {
    const parsed = c.req.valid('json')
    const currentUser = c.get('user')
    const targetId = c.req.param('id')

    const { db } = c.get('services')

    const [existing] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

    if (!existing) {
      return c.json({ error: 'User not found' }, 404)
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
      return c.json({ error: 'No changes provided' }, 400)
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

    return c.json({ user: updated })
  }
)

adminApp.delete('/users/:id', withRateLimit('users-mutate'), async (c) => {
  const currentUser = c.get('user')
  const targetId = c.req.param('id')

  if (targetId === currentUser.id) {
    return c.json({ error: 'Cannot delete yourself' }, 400)
  }

  const { db } = c.get('services')

  const [existing] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, targetId), isNull(user.deletedAt)))

  if (!existing) {
    return c.json({ error: 'User not found' }, 404)
  }

  await db
    .update(user)
    .set({ deletedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))` })
    .where(eq(user.id, targetId))

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
    return c.json({ error: 'No file provided' }, 400)
  }

  const validationError = validateImageUpload(file)
  if (validationError) {
    return c.json({ error: validationError }, 400)
  }

  const key = generateStorageKey(file.name)
  const result = await c.get('services').storage.put(key, file.stream(), {
    contentType: file.type,
  })

  return c.json({ key: result.key, url: result.url }, 201)
})

// ── Admin Cleanup ────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

app.post('/api/admin/cleanup', async (c) => {
  const cronSecret = c.req.header('x-cron-secret')
  const currentUser = c.get('user')
  const isCron = cronSecret && cronSecret === c.get('services').env.cronSecret

  if (!isCron && (!currentUser || currentUser.role !== 'admin')) {
    return c.json({ error: 'Forbidden' }, 403)
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

  return c.json({
    cutoff: cutoff.toISOString(),
    purged: { items: deletedItems.length, posts: deletedPosts.length, users: deletedUsers.length },
  })
})

// ── Mount sub-apps ───────────────────────────────────────────────────

const routes = app
  .route('/api', protectedApp)
  .route('/api/blog', blogApp)
  .route('/api/admin', adminApp)

export type AppType = typeof routes
export { app }
