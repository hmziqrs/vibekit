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
    type: text('type').default('general'),
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

export const organization = sqliteTable(
  'organization',
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
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('organization_owner_id_idx').on(table.ownerId),
    index('organization_slug_deleted_idx').on(table.slug, table.deletedAt),
  ]
)

export const organizationMember = sqliteTable(
  'organization_member',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    joinedAt: integer('joined_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] })
      .default('member')
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('org_member_org_id_idx').on(table.organizationId),
    index('org_member_user_id_idx').on(table.userId),
  ]
)

export const organizationInvitation = sqliteTable(
  'organization_invitation',
  {
    acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    email: text('email').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'member', 'viewer'] })
      .default('member')
      .notNull(),
    token: text('token').notNull().unique(),
  },
  (table) => [
    index('org_invitation_email_idx').on(table.email),
    index('org_invitation_org_id_idx').on(table.organizationId),
    index('org_invitation_token_idx').on(table.token),
  ]
)

export const team = sqliteTable(
  'team',
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
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('team_organization_id_idx').on(table.organizationId)]
)

export const teamMember = sqliteTable(
  'team_member',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    joinedAt: integer('joined_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    role: text('role', { enum: ['lead', 'member'] })
      .default('member')
      .notNull(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('team_member_team_id_idx').on(table.teamId),
    index('team_member_user_id_idx').on(table.userId),
  ]
)

export const teamActivity = sqliteTable(
  'team_activity',
  {
    action: text('action').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    entityId: text('entity_id'),
    entityType: text('entity_type'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    metadata: text('metadata'),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
  },
  (table) => [index('team_activity_team_created_idx').on(table.teamId, table.createdAt)]
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

export const organizationRelations = relations(organization, ({ many, one }) => ({
  invitations: many(organizationInvitation),
  members: many(organizationMember),
  owner: one(user, { fields: [organization.ownerId], references: [user.id] }),
  teams: many(team),
}))

export const teamRelations = relations(team, ({ many, one }) => ({
  activities: many(teamActivity),
  members: many(teamMember),
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
}))

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, { fields: [teamMember.teamId], references: [team.id] }),
  user: one(user, { fields: [teamMember.userId], references: [user.id] }),
}))

export const teamActivityRelations = relations(teamActivity, ({ one }) => ({
  actor: one(user, { fields: [teamActivity.actorId], references: [user.id] }),
  team: one(team, { fields: [teamActivity.teamId], references: [team.id] }),
}))

export const organizationMemberRelations = relations(organizationMember, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationMember.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [organizationMember.userId], references: [user.id] }),
}))

export const userOrgMemberRelations = relations(user, ({ many }) => ({
  organizationInvitations: many(organizationInvitation),
  organizationMemberships: many(organizationMember),
  teamMemberships: many(teamMember),
}))

export const organizationInvitationRelations = relations(organizationInvitation, ({ one }) => ({
  inviter: one(user, {
    fields: [organizationInvitation.invitedBy],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [organizationInvitation.organizationId],
    references: [organization.id],
  }),
}))

export * from './auth.schema'
