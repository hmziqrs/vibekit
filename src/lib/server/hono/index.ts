import { writeAuditLog } from '$lib/server/audit'
import {
  blogPost,
  blogPostRevision,
  blogPostSlugHistory,
  blogPostTag,
  blogTag,
  item,
  user,
} from '$lib/server/db/schema'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  NotFoundError,
} from '$lib/server/errors'
import { generateStorageKey, validateImageUpload, validateMediaUpload } from '$lib/server/upload'
import { uuid } from '$lib/server/uuid'
import {
  createItemSchema,
  createPostSchema,
  updateItemSchema,
  updatePostSchema,
} from '$lib/validators'
import { zValidator } from '@hono/zod-validator'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
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
        or(like(blogPost.title, `%${q}%`), like(blogPost.slug, `%${q}%`))
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

  const validStatuses = ['draft', 'published', 'archived'] as const
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
    conditions.push(or(like(blogPost.title, `%${q}%`), like(blogPost.slug, `%${q}%`))!)
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

  return c.json({ id }, 201)
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

  if (data.slug !== undefined && data.slug !== existing.slug) {
    await db.insert(blogPostSlugHistory).values({ id: uuid(), oldSlug: existing.slug, postId: id })
    updates.slug = data.slug
  }

  if (data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = new Date()
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
  if (!name?.trim()) throw new BadRequestError('Name is required')

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const { db } = c.get('services')

  const existing = await db
    .select({ id: blogTag.id })
    .from(blogTag)
    .where(eq(blogTag.slug, slug))
    .get()
  if (existing) throw new ConflictError('Tag already exists')

  const id = uuid()
  await db.insert(blogTag).values({ id, name: name.trim(), slug })
  return c.json({ id, name: name.trim(), slug }, 201)
})

blogApp.delete('/tags/:id', withRateLimit('blog-mutate'), async (c) => {
  const { db } = c.get('services')
  await db.delete(blogPostTag).where(eq(blogPostTag.tagId, c.req.param('id')))
  await db.delete(blogTag).where(eq(blogTag.id, c.req.param('id')))
  return c.json({ success: true })
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

  return c.json({ user: updated })
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
