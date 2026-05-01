import { uuid } from '$lib/server/uuid'
import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth.schema'

export const contactSubmission = sqliteTable('contact_submission', {
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
})

export const blogPost = sqliteTable('blog_post', {
  authorId: text('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
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
    .notNull(),
})

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
  (table) => ({
    oldSlugIdx: index('blog_slug_history_old_slug_idx').on(table.oldSlug),
  })
)

export const item = sqliteTable('item', {
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
    .notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const auditLog = sqliteTable('audit_log', {
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
})

export * from './auth.schema'
