import { z } from 'zod/v4'

export const WEBHOOK_EVENT_TYPES = [
  '*',
  'account.export',
  'announcement.create',
  'announcement.delete',
  'announcement.update',
  'api_key.created',
  'api_key.deleted',
  'api_key.revoked',
  'api_key.rotated',
  'api_key.updated',
  'blog.archive',
  'blog.create',
  'blog.delete',
  'blog.publish',
  'blog.restore',
  'blog.unpublish',
  'blog.update',
  'blog_series.create',
  'blog_series.delete',
  'blog_series.update',
  'blog_tag.create',
  'blog_tag.delete',
  'comment.admin_delete',
  'comment.create',
  'comment.delete',
  'comment.moderate',
  'content.report',
  'item.create',
  'item.delete',
  'item.update',
  'newsletter.subscriber_delete',
  'notification.broadcast',
  'organization.accept_invitation',
  'organization.create',
  'organization.delete',
  'organization.invite',
  'organization.member.remove',
  'organization.member.update_role',
  'organization.transfer_ownership',
  'organization.update',
  'team.create',
  'team.delete',
  'team.member.add',
  'team.member.remove',
  'team.member.update_role',
  'team.update',
  'user.ban',
  'user.delete',
  'user.impersonate_start',
  'user.impersonate_stop',
  'user.unban',
  'user.update',
  'webhook.test',
] as const

export const createWebhookEndpointSchema = z.object({
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1, 'Select at least one event').max(50),
  url: z
    .string()
    .trim()
    .url()
    .refine(
      (val) => val.startsWith('https://') || val.startsWith('http://'),
      'URL must start with http:// or https://'
    ),
})

export const updateWebhookEndpointSchema = z.object({
  active: z.boolean().optional(),
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).max(50).optional(),
  url: z.string().trim().url().optional(),
})

export const listDeliveriesSchema = z.object({
  eventType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['failed', 'pending', 'retrying', 'success']).optional(),
})
