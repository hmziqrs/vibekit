import { uuid } from '$lib/server/uuid'
import { relations, sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
    seoDescription: text('seo_description'),
    seoTitle: text('seo_title'),
    slug: text('slug').notNull().unique(),
    status: text('status', { enum: ['draft', 'published', 'archived', 'scheduled'] })
      .default('draft')
      .notNull(),
    title: text('title').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    viewCount: integer('view_count').default(0).notNull(),
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

export const blogSeries = sqliteTable('blog_series', {
  coverImageUrl: text('cover_image_url'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  description: text('description'),
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
})

export const blogPostSeries = sqliteTable(
  'blog_post_series',
  {
    postId: text('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
    seriesId: text('series_id')
      .notNull()
      .references(() => blogSeries.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.seriesId] }),
    postIdIdx: index('blog_post_series_post_id_idx').on(table.postId),
    seriesIdIdx: index('blog_post_series_series_id_idx').on(table.seriesId),
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
    slug: text('slug').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('organization_owner_id_idx').on(table.ownerId),
    index('organization_slug_deleted_idx').on(table.slug, table.deletedAt),
    uniqueIndex('organization_slug_active_idx').on(table.slug, table.deletedAt),
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
    uniqueIndex('org_member_user_org_idx').on(table.userId, table.organizationId),
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
    uniqueIndex('team_member_user_team_idx').on(table.userId, table.teamId),
  ]
)

export const impersonationSession = sqliteTable(
  'impersonation_session',
  {
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    reason: text('reason'),
    sessionToken: text('session_token').notNull(),
    targetUserId: text('target_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('impersonation_admin_idx').on(table.adminUserId),
    index('impersonation_session_token_idx').on(table.sessionToken),
  ]
)

export const contentReport = sqliteTable(
  'content_report',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    description: text('description'),
    entityId: text('entity_id').notNull(),
    entityType: text('entity_type', {
      enum: ['blogPost', 'contactSubmission', 'item', 'organization', 'team', 'user'],
    }).notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    reason: text('reason', {
      enum: ['harassment', 'inappropriate', 'misinformation', 'other', 'spam'],
    }).notNull(),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
    status: text('status', { enum: ['dismissed', 'pending', 'resolved', 'reviewing'] })
      .default('pending')
      .notNull(),
  },
  (table) => [
    index('content_report_entity_idx').on(table.entityType, table.entityId),
    index('content_report_status_created_idx').on(table.status, table.createdAt),
  ]
)

export const systemConfig = sqliteTable('system_config', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  description: text('description'),
  environment: text('environment'),
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  key: text('key').notNull().unique(),
  type: text('type', { enum: ['boolean', 'json', 'string'] })
    .default('string')
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  value: text('value').notNull(),
})

export const announcement = sqliteTable(
  'announcement',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    message: text('message').notNull(),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    type: text('type', { enum: ['critical', 'info', 'warning'] })
      .default('info')
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('announcement_active_idx').on(table.isActive)]
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
  postSeries: many(blogPostSeries),
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

export const blogSeriesRelations = relations(blogSeries, ({ many }) => ({
  postSeries: many(blogPostSeries),
}))

export const blogPostSeriesRelations = relations(blogPostSeries, ({ one }) => ({
  post: one(blogPost, { fields: [blogPostSeries.postId], references: [blogPost.id] }),
  series: one(blogSeries, { fields: [blogPostSeries.seriesId], references: [blogSeries.id] }),
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

export const impersonationSessionRelations = relations(impersonationSession, ({ one }) => ({
  adminUser: one(user, {
    fields: [impersonationSession.adminUserId],
    references: [user.id],
    relationName: 'impersonationAdmin',
  }),
  targetUser: one(user, {
    fields: [impersonationSession.targetUserId],
    references: [user.id],
    relationName: 'impersonationTarget',
  }),
}))

export const systemConfigRelations = relations(systemConfig, ({ one }) => ({
  updater: one(user, {
    fields: [systemConfig.updatedBy],
    references: [user.id],
    relationName: 'configUpdater',
  }),
}))

export const announcementRelations = relations(announcement, ({ one }) => ({
  creator: one(user, {
    fields: [announcement.createdBy],
    references: [user.id],
    relationName: 'announcementCreator',
  }),
}))

export const contentReportRelations = relations(contentReport, ({ one }) => ({
  reporter: one(user, {
    fields: [contentReport.reporterId],
    references: [user.id],
    relationName: 'contentReportReporter',
  }),
  resolver: one(user, {
    fields: [contentReport.resolvedBy],
    references: [user.id],
    relationName: 'contentReportResolver',
  }),
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

export const notification = sqliteTable(
  'notification',
  {
    archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
    body: text('body'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    entityId: text('entity_id'),
    entityType: text('entity_type'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    link: text('link'),
    metadata: text('metadata'),
    readAt: integer('read_at', { mode: 'timestamp_ms' }),
    title: text('title').notNull(),
    type: text('type', { enum: ['error', 'info', 'success', 'warning'] })
      .default('info')
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('notification_user_read_idx').on(table.userId, table.readAt)]
)

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}))

export const notificationPreference = sqliteTable(
  'notification_preference',
  {
    channel: text('channel', { enum: ['email', 'in_app', 'push'] }).notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    type: text('type').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('notification_pref_user_type_idx').on(table.userId, table.type, table.channel),
  ]
)

export const notificationPreferenceRelations = relations(notificationPreference, ({ one }) => ({
  user: one(user, {
    fields: [notificationPreference.userId],
    references: [user.id],
  }),
}))

// @ts-expect-error -- self-referencing FK (parentId -> comment.id) causes circular type inference; safe at runtime
export const comment = sqliteTable(
  'comment',
  {
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    editedAt: integer('edited_at', { mode: 'timestamp_ms' }),
    htmlContent: text('html_content'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    ipAddress: text('ip_address'),
    moderatedAt: integer('moderated_at', { mode: 'timestamp_ms' }),
    moderatedBy: text('moderated_by').references(() => user.id, { onDelete: 'set null' }),
    parentId: text('parent_id').references(
      // @ts-expect-error -- self-referencing FK causes circular type inference; callback is lazy so this is safe at runtime
      () => comment.id,
      { onDelete: 'cascade' }
    ),
    postId: text('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
    spamReason: text('spam_reason'),
    spamScore: integer('spam_score').default(0),
    status: text('status', {
      enum: ['approved', 'pending', 'rejected', 'spam'],
    })
      .default('pending')
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('comment_post_status_idx').on(table.postId, table.status, table.createdAt),
    index('comment_parent_idx').on(table.parentId),
    index('comment_author_idx').on(table.authorId),
    index('comment_status_created_idx').on(table.status, table.createdAt),
  ]
)

export const commentRelations = relations(comment, ({ one }) => ({
  author: one(user, { fields: [comment.authorId], references: [user.id] }),
  moderator: one(user, {
    fields: [comment.moderatedBy],
    references: [user.id],
    relationName: 'commentModerator',
  }),
  parent: one(comment, {
    fields: [comment.parentId],
    references: [comment.id],
    relationName: 'commentReplies',
  }),
  post: one(blogPost, { fields: [comment.postId], references: [blogPost.id] }),
}))

export const newsletterSubscriber = sqliteTable(
  'newsletter_subscriber',
  {
    confirmationToken: text('confirmation_token').notNull().unique(),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    email: text('email').notNull().unique(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    ipAddress: text('ip_address'),
    name: text('name'),
    source: text('source').default('blog'),
    status: text('status', {
      enum: ['bounced', 'confirmed', 'pending', 'unsubscribed'],
    })
      .default('pending')
      .notNull(),
    unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('newsletter_subscriber_status_idx').on(table.status),
    index('newsletter_subscriber_email_idx').on(table.email),
    index('newsletter_subscriber_token_idx').on(table.confirmationToken),
  ]
)

export const blogPostView = sqliteTable(
  'blog_post_view',
  {
    country: text('country'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    isCompleted: integer('is_completed', { mode: 'boolean' }).default(false).notNull(),
    postId: text('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
    readTime: integer('read_time'),
    readingProgress: integer('reading_progress').default(0).notNull(),
    referrer: text('referrer'),
    referrerDomain: text('referrer_domain'),
    userAgent: text('user_agent'),
    visitorHash: text('visitor_hash').notNull(),
  },
  (table) => [
    index('blog_post_view_post_created_idx').on(table.postId, table.createdAt),
    index('blog_post_view_post_visitor_idx').on(table.postId, table.visitorHash),
  ]
)

export const blogPostViewRelations = relations(blogPostView, ({ one }) => ({
  post: one(blogPost, { fields: [blogPostView.postId], references: [blogPost.id] }),
}))

// ── Billing ────────────────────────────────────────────────────────────

export const subscriptionPlan = sqliteTable(
  'subscription_plan',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    currency: text('currency', { length: 3 })
      .notNull()
      .$defaultFn(() => 'usd'),
    description: text('description'),
    features: text('features'), // JSON array of feature strings
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    interval: text('interval', { enum: ['month', 'year'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    name: text('name').notNull(),
    priceInCents: integer('price_in_cents').notNull(),
    slug: text('slug').notNull().unique(),
    sortOrder: integer('sort_order').default(0).notNull(),
    stripePriceId: text('stripe_price_id'),
    taxInclusive: integer('tax_inclusive', { mode: 'boolean' }).default(false).notNull(),
    taxRate: integer('tax_rate'), // Percentage, e.g. 850 = 8.5%
    trialDays: integer('trial_days').default(0).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('subscription_plan_slug_idx').on(table.slug)]
)

export const subscription = sqliteTable(
  'subscription',
  {
    canceledAt: integer('canceled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }).notNull(),
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp_ms' }).notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    metadata: text('metadata'), // JSON
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    planId: text('plan_id')
      .notNull()
      .references(() => subscriptionPlan.id),
    status: text('status', {
      enum: ['active', 'canceled', 'incomplete', 'past_due', 'paused', 'trialing'],
    })
      .notNull()
      .default('incomplete'),
    stripeCustomerId: text('stripe_customer_id'),
    stripePriceId: text('stripe_price_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    trialEnd: integer('trial_end', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('subscription_org_idx').on(table.organizationId),
    index('subscription_status_idx').on(table.status),
    index('subscription_stripe_customer_idx').on(table.stripeCustomerId),
    index('subscription_stripe_sub_idx').on(table.stripeSubscriptionId),
    index('subscription_user_idx').on(table.userId),
    index('subscription_user_status_idx').on(table.userId, table.status),
  ]
)

export const subscriptionEvent = sqliteTable(
  'subscription_event',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    fromPlanId: text('from_plan_id'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    metadata: text('metadata'), // JSON
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    toPlanId: text('to_plan_id'),
    type: text('type', {
      enum: [
        'canceled',
        'created',
        'downgraded',
        'past_due',
        'payment_failed',
        'renewed',
        'trial_ended',
        'trial_started',
        'upgraded',
      ],
    }).notNull(),
  },
  (table) => [index('subscription_event_sub_idx').on(table.subscriptionId)]
)

export const usageRecord = sqliteTable(
  'usage_record',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    metricType: text('metric_type', {
      enum: ['api_calls', 'requests', 'seats', 'storage'],
    }).notNull(),
    periodEnd: integer('period_end', { mode: 'timestamp_ms' }).notNull(),
    periodStart: integer('period_start', { mode: 'timestamp_ms' }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('usage_record_sub_period_idx').on(
      table.subscriptionId,
      table.periodStart,
      table.periodEnd
    ),
  ]
)

export const invoice = sqliteTable(
  'invoice',
  {
    amountInCents: integer('amount_in_cents').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    currency: text('currency', { length: 3 })
      .notNull()
      .$defaultFn(() => 'usd'),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    organizationId: text('organization_id'),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
    pdfUrl: text('pdf_url'),
    status: text('status', {
      enum: ['draft', 'open', 'paid', 'uncollectible', 'void'],
    })
      .notNull()
      .default('draft'),
    stripeInvoiceId: text('stripe_invoice_id'),
    subscriptionId: text('subscription_id').references(() => subscription.id, {
      onDelete: 'set null',
    }),
    taxAmountInCents: integer('tax_amount_in_cents').default(0),
    userId: text('user_id'),
  },
  (table) => [
    index('invoice_stripe_idx').on(table.stripeInvoiceId),
    index('invoice_user_idx').on(table.userId),
    index('invoice_org_idx').on(table.organizationId),
  ]
)

export const paymentMethod = sqliteTable(
  'payment_method',
  {
    brand: text('brand'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiryMonth: integer('expiry_month'),
    expiryYear: integer('expiry_year'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
    last4: text('last4'),
    stripePaymentMethodId: text('stripe_payment_method_id').notNull(),
    type: text('type', { enum: ['bank_transfer', 'card'] }).notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('payment_method_stripe_idx').on(table.stripePaymentMethodId)]
)

// ── Coupons ────────────────────────────────────────────────────────────

export const coupon = sqliteTable('coupon', {
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  code: text('code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  currency: text('currency', { length: 3 })
    .notNull()
    .$defaultFn(() => 'usd'),
  duration: text('duration', { enum: ['forever', 'once', 'repeating'] })
    .notNull()
    .default('once'),
  durationInMonths: integer('duration_in_months'),
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  maxRedemptions: integer('max_redemptions'),
  name: text('name').notNull(),
  percentOff: integer('percent_off').notNull(),
  redeemBy: integer('redeem_by', { mode: 'timestamp_ms' }),
  stripeCouponId: text('stripe_coupon_id'),
  timesRedeemed: integer('times_redeemed').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  valid: integer('valid', { mode: 'boolean' }).default(true).notNull(),
})

export const subscriptionPlanRelations = relations(subscriptionPlan, ({ many }) => ({
  subscriptions: many(subscription),
}))

export const subscriptionRelations = relations(subscription, ({ many, one }) => ({
  events: many(subscriptionEvent),
  invoices: many(invoice),
  organization: one(organization, {
    fields: [subscription.organizationId],
    references: [organization.id],
  }),
  plan: one(subscriptionPlan, { fields: [subscription.planId], references: [subscriptionPlan.id] }),
  usageRecords: many(usageRecord),
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
}))

export const subscriptionEventRelations = relations(subscriptionEvent, ({ one }) => ({
  subscription: one(subscription, {
    fields: [subscriptionEvent.subscriptionId],
    references: [subscription.id],
  }),
}))

export const usageRecordRelations = relations(usageRecord, ({ one }) => ({
  subscription: one(subscription, {
    fields: [usageRecord.subscriptionId],
    references: [subscription.id],
  }),
}))

export const invoiceRelations = relations(invoice, ({ one }) => ({
  subscription: one(subscription, {
    fields: [invoice.subscriptionId],
    references: [subscription.id],
  }),
}))

export const paymentMethodRelations = relations(paymentMethod, ({ one }) => ({
  user: one(user, { fields: [paymentMethod.userId], references: [user.id] }),
}))

// ── Stripe Webhook Events (idempotency) ──────────────────────────────

export const stripeWebhookEvent = sqliteTable('stripe_webhook_event', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  errorMessage: text('error_message'),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp_ms' }),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
  retryCount: integer('retry_count').notNull().default(0),
  status: text('status', { enum: ['failed', 'pending', 'processed', 'retrying'] })
    .notNull()
    .default('pending'),
})

// ── Push Notifications ─────────────────────────────────────────────────

export const pushSubscription = sqliteTable(
  'push_subscription',
  {
    auth: text('auth').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    endpoint: text('endpoint').notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    p256dh: text('p256dh').notNull(),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('push_sub_user_idx').on(table.userId),
    uniqueIndex('push_sub_endpoint_idx').on(table.endpoint),
  ]
)

export const pushSubscriptionRelations = relations(pushSubscription, ({ one }) => ({
  user: one(user, { fields: [pushSubscription.userId], references: [user.id] }),
}))

// ── API Keys ───────────────────────────────────────────────────────────

export const apiKey = sqliteTable(
  'api_key',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    name: text('name').notNull(),
    rateLimit: integer('rate_limit'),
    requestCount: integer('request_count').default(0).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('api_key_user_idx').on(table.userId),
    index('api_key_hash_idx').on(table.keyHash),
  ]
)

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, { fields: [apiKey.userId], references: [user.id] }),
}))

export const apiKeyUsageLog = sqliteTable(
  'api_key_usage_log',
  {
    apiKeyId: text('api_key_id')
      .notNull()
      .references(() => apiKey.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    endpoint: text('endpoint').notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    ipAddress: text('ip_address'),
    method: text('method').notNull(),
    statusCode: integer('status_code').notNull(),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('api_key_usage_api_key_idx').on(table.apiKeyId),
    index('api_key_usage_created_idx').on(table.createdAt),
  ]
)

export const apiKeyUsageLogRelations = relations(apiKeyUsageLog, ({ one }) => ({
  apiKey: one(apiKey, { fields: [apiKeyUsageLog.apiKeyId], references: [apiKey.id] }),
}))

export const webhookEndpoint = sqliteTable(
  'webhook_endpoint',
  {
    active: integer('active', { mode: 'boolean' }).default(true).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    description: text('description'),
    events: text('events', { mode: 'json' }).$type<string[]>().notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    secret: text('secret').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    url: text('url').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('webhook_endpoint_user_idx').on(table.userId),
    index('webhook_endpoint_active_idx').on(table.active),
  ]
)

export const webhookEndpointRelations = relations(webhookEndpoint, ({ one }) => ({
  user: one(user, { fields: [webhookEndpoint.userId], references: [user.id] }),
}))

export const webhookDelivery = sqliteTable(
  'webhook_delivery',
  {
    attemptCount: integer('attempt_count').default(0).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    endpointId: text('endpoint_id')
      .notNull()
      .references(() => webhookEndpoint.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    nextRetryAt: integer('next_retry_at', { mode: 'timestamp_ms' }),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    responseBody: text('response_body'),
    status: text('status', { enum: ['failed', 'pending', 'retrying', 'success'] })
      .default('pending')
      .notNull(),
    statusCode: integer('status_code'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('webhook_delivery_endpoint_idx').on(table.endpointId),
    index('webhook_delivery_status_idx').on(table.status, table.createdAt),
    index('webhook_delivery_event_type_idx').on(table.eventType, table.createdAt),
  ]
)

export const webhookDeliveryRelations = relations(webhookDelivery, ({ one }) => ({
  endpoint: one(webhookEndpoint, {
    fields: [webhookDelivery.endpointId],
    references: [webhookEndpoint.id],
  }),
}))

export const integration = sqliteTable(
  'integration',
  {
    accessToken: text('access_token').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    externalAccountId: text('external_account_id'),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    lastError: text('last_error'),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    provider: text('provider').notNull(),
    refreshToken: text('refresh_token'),
    scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull().default([]),
    status: text('status', { mode: 'text' }).notNull().default('active'),
    tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('integration_user_idx').on(table.userId),
    index('integration_org_idx').on(table.organizationId),
    index('integration_provider_idx').on(table.provider, table.status),
  ]
)

export const integrationRelations = relations(integration, ({ one }) => ({
  organization: one(organization, {
    fields: [integration.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [integration.userId],
    references: [user.id],
  }),
}))

export const oauthState = sqliteTable(
  'oauth_state',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    data: text('data', { mode: 'json' })
      .$type<{
        codeVerifier?: string
        provider: string
        redirectUrl?: string
        userId: string
      }>()
      .notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
  },
  (table) => [index('oauth_state_created_idx').on(table.createdAt)]
)

export const featureFlag = sqliteTable(
  'feature_flag',
  {
    cohortRules: text('cohort_rules', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    dependencies: text('dependencies', { mode: 'json' }).$type<string[]>().default([]),
    description: text('description'),
    enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
    environment: text('environment'),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    key: text('key').notNull().unique(),
    killSwitch: integer('kill_switch', { mode: 'boolean' }).default(false).notNull(),
    name: text('name').notNull(),
    rolloutPercentage: integer('rollout_percentage').default(0).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('feature_flag_key_idx').on(table.key),
    index('feature_flag_enabled_idx').on(table.enabled),
  ]
)

export const abExperiment = sqliteTable(
  'ab_experiment',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    description: text('description'),
    endDate: integer('end_date', { mode: 'timestamp_ms' }),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    startDate: integer('start_date', { mode: 'timestamp_ms' }),
    status: text('status', { enum: ['draft', 'running', 'paused', 'completed', 'archived'] })
      .default('draft')
      .notNull(),
    targetMetric: text('target_metric').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    winningVariantId: text('winning_variant_id'),
  },
  (table) => [
    index('ab_experiment_key_idx').on(table.key),
    index('ab_experiment_status_idx').on(table.status),
  ]
)

export const abVariant = sqliteTable(
  'ab_variant',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    description: text('description'),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => abExperiment.id, { onDelete: 'cascade' }),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    isControl: integer('is_control', { mode: 'boolean' }).default(false).notNull(),
    name: text('name').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    trafficPercentage: integer('traffic_percentage').default(50).notNull(),
  },
  (table) => [index('ab_variant_experiment_idx').on(table.experimentId)]
)

export const abAssignment = sqliteTable(
  'ab_assignment',
  {
    assignedAt: integer('assigned_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => abExperiment.id, { onDelete: 'cascade' }),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    sessionId: text('session_id'),
    userId: text('user_id'),
    variantId: text('variant_id')
      .notNull()
      .references(() => abVariant.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('ab_assignment_experiment_idx').on(table.experimentId),
    index('ab_assignment_user_idx').on(table.userId),
    index('ab_assignment_session_idx').on(table.sessionId),
  ]
)

export const abEvent = sqliteTable(
  'ab_event',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    eventName: text('event_name').notNull(),
    eventType: text('event_type').notNull(),
    eventValue: integer('event_value'),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => abExperiment.id, { onDelete: 'cascade' }),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    sessionId: text('session_id'),
    userId: text('user_id'),
    variantId: text('variant_id')
      .notNull()
      .references(() => abVariant.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('ab_event_experiment_idx').on(table.experimentId),
    index('ab_event_type_idx').on(table.eventType),
    index('ab_event_created_idx').on(table.createdAt),
  ]
)

export const configVersion = sqliteTable(
  'config_version',
  {
    changedBy: text('changed_by').references(() => user.id, { onDelete: 'set null' }),
    configKey: text('config_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    environment: text('environment'),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    newValue: text('new_value'),
    oldValue: text('old_value'),
  },
  (table) => [
    index('config_version_key_idx').on(table.configKey),
    index('config_version_created_idx').on(table.createdAt),
  ]
)

export const uploadSession = sqliteTable(
  'upload_session',
  {
    chunkSize: integer('chunk_size').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size').notNull(),
    fileType: text('file_type').notNull(),
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => uuid()),
    receivedChunks: text('received_chunks', { mode: 'json' }).$type<number[]>().default([]),
    status: text('status', { enum: ['pending', 'uploading', 'complete', 'failed', 'expired'] })
      .default('pending')
      .notNull(),
    storageKey: text('storage_key'),
    totalChunks: integer('total_chunks').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('upload_session_user_idx').on(table.userId),
    index('upload_session_status_idx').on(table.status),
    index('upload_session_expires_idx').on(table.expiresAt),
  ]
)

export const rateLimitLog = sqliteTable('rate_limit_log', {
  count: integer('count').notNull().default(1),
  key: text('key').primaryKey(),
  resetAt: integer('reset_at').notNull(),
})

export const trustedDevice = sqliteTable(
  'trusted_device',
  {
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    ipAddress: text('ip_address'),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('trusted_device_user_idx').on(table.userId),
    index('trusted_device_expires_idx').on(table.expiresAt),
  ]
)

export const emailQueue = sqliteTable(
  'email_queue',
  {
    attempts: integer('attempts').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    errorMessage: text('error_message'),
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp_ms' }),
    maxRetries: integer('max_retries').notNull().default(3),
    message: text('message', { mode: 'json' })
      .$type<{
        to: string | string[]
        from: string
        subject: string
        html?: string
        text?: string
        headers?: Record<string, string>
        replyTo?: string
      }>()
      .notNull(),
    nextRetryAt: integer('next_retry_at', { mode: 'timestamp_ms' }),
    processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
    status: text('status', { enum: ['failed', 'pending', 'processing', 'sent'] })
      .notNull()
      .default('pending'),
  },
  (table) => [
    index('email_queue_status_idx').on(table.status, table.createdAt),
    index('email_queue_next_retry_idx').on(table.nextRetryAt),
  ]
)

export * from './auth.schema'
