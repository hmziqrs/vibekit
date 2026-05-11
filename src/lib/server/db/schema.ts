import { uuid } from '$lib/server/uuid'
import { relations, sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth.schema'

export const contactSubmission = sqliteTable(
  'contact_submission',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    email: text('email').notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    message: text('message').notNull(),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
  },
  (table) => [index('contact_submission_created_idx').on(table.createdAt)]
)

export const blogPost = sqliteTable(
  'blog_post',
  {
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    canonicalUrl: text('canonical_url'),
    contentBody: text('content_body'),
    coverImageUrl: text('cover_image_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    excerpt: text('excerpt'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    ogImageUrl: text('og_image_url'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    seoDescription: text('seo_description'),
    seoTitle: text('seo_title'),
    slug: text('slug').notNull().unique(),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .default('draft')
      .notNull(),
    title: text('title').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('blog_post_status_deleted_published_idx').on(
      table.status,
      table.deletedAt,
      table.publishedAt
    ),
    index('blog_post_deleted_idx').on(table.deletedAt),
  ]
)

export const blogTag = sqliteTable('blog_tag', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
})

export const blogPostTag = sqliteTable(
  'blog_post_tag',
  {
    postId: text('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => blogTag.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.tagId] }),
    postIdIdx: index('blog_post_tag_post_id_idx').on(table.postId),
    tagIdIdx: index('blog_post_tag_tag_id_idx').on(table.tagId),
  })
)

export const blogPostSlugHistory = sqliteTable(
  'blog_post_slug_history',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    oldSlug: text('old_slug').notNull(),
    postId: text('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
  },
  (table) => [index('blog_slug_history_old_slug_idx').on(table.oldSlug)]
)

export const item = sqliteTable(
  'item',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    description: text('description'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    name: text('name').notNull(),
    status: text('status', { enum: ['active', 'archived'] })
      .default('active')
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('item_user_deleted_idx').on(table.userId, table.deletedAt)]
)

export const auditLog = sqliteTable(
  'audit_log',
  {
    action: text('action').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    entityId: text('entity_id').notNull(),
    entityType: text('entity_type').notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    metadata: text('metadata'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('audit_log_action_created_idx').on(table.action, table.createdAt)]
)

export const loginAttempt = sqliteTable('login_attempt', {
  attemptCount: integer('attempt_count').notNull().default(0),
  id: text('id').primaryKey(),
  lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp_ms' }).notNull(),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
})

export const securityEvent = sqliteTable(
  'security_event',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    eventType: text('event_type').notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    ipAddress: text('ip_address'),
    metadata: text('metadata'),
    userAgent: text('user_agent'),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('security_event_type_created_idx').on(table.eventType, table.createdAt),
    index('security_event_user_id_idx').on(table.userId),
  ]
)

export const blogPostRevision = sqliteTable(
  'blog_post_revision',
  {
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    changeDescription: text('change_description'),
    contentBody: text('content_body'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    excerpt: text('excerpt'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    postId: text('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
  },
  (table) => [index('blog_revision_post_id_idx').on(table.postId)]
)

// Drizzle relations for app tables
export const blogPostRelations = relations(blogPost, ({ many, one }) => ({
  author: one(user, { fields: [blogPost.authorId], references: [user.id] }),
  postTags: many(blogPostTag),
  revisions: many(blogPostRevision),
  slugHistory: many(blogPostSlugHistory),
}))

export const blogTagRelations = relations(blogTag, ({ many }) => ({
  postTags: many(blogPostTag),
}))

export const blogPostTagRelations = relations(blogPostTag, ({ one }) => ({
  post: one(blogPost, { fields: [blogPostTag.postId], references: [blogPost.id] }),
  tag: one(blogTag, { fields: [blogPostTag.tagId], references: [blogTag.id] }),
}))

export const blogPostRevisionRelations = relations(blogPostRevision, ({ one }) => ({
  author: one(user, { fields: [blogPostRevision.authorId], references: [user.id] }),
  post: one(blogPost, { fields: [blogPostRevision.postId], references: [blogPost.id] }),
}))

export const blogPostSlugHistoryRelations = relations(blogPostSlugHistory, ({ one }) => ({
  post: one(blogPost, { fields: [blogPostSlugHistory.postId], references: [blogPost.id] }),
}))

export const itemRelations = relations(item, ({ one }) => ({
  user: one(user, { fields: [item.userId], references: [user.id] }),
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, { fields: [auditLog.userId], references: [user.id] }),
}))

export const securityEventRelations = relations(securityEvent, ({ one }) => ({
  user: one(user, { fields: [securityEvent.userId], references: [user.id] }),
}))

export * from './auth.schema'
