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
  'integration.connected',
  'integration.disconnected',
  'integration.error',
  'integration.health_check',
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

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // cloud metadata
  'metadata.google.internal',
]

function isValidWebhookUrl(val: string): boolean {
  if (!val.startsWith('https://')) return false
  try {
    const url = new URL(val)
    const host = url.hostname.toLowerCase()
    if (BLOCKED_HOSTS.includes(host)) return false
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false
    if (host.endsWith('.internal') || host.endsWith('.local')) return false
    if (url.port && ['22', '25', '3306', '5432', '6379'].includes(url.port)) return false
    return true
  } catch {
    return false
  }
}

export const createWebhookEndpointSchema = z.object({
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1, 'Select at least one event').max(50),
  url: z
    .string()
    .trim()
    .url()
    .refine(isValidWebhookUrl, 'URL must use HTTPS and not target private/internal addresses'),
})

export const updateWebhookEndpointSchema = z.object({
  active: z.boolean().optional(),
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).max(50).optional(),
  url: z
    .string()
    .trim()
    .url()
    .refine(isValidWebhookUrl, 'URL must use HTTPS and not target private/internal addresses')
    .optional(),
})

export const listDeliveriesSchema = z.object({
  eventType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['failed', 'pending', 'retrying', 'success']).optional(),
})
