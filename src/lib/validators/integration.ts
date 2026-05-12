import { z } from 'zod/v4'

export const INTEGRATION_PROVIDER_SLUGS = [
  'discord',
  'github',
  'linear',
  'notion',
  'slack',
] as const

export const INTEGRATION_STATUSES = ['active', 'disconnected', 'error', 'expired'] as const

export const connectIntegrationSchema = z.object({
  organizationId: z.string().trim().optional(),
  redirectUrl: z.string().trim().url().optional(),
})

export const listIntegrationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  provider: z.enum(INTEGRATION_PROVIDER_SLUGS).optional(),
  status: z.enum(INTEGRATION_STATUSES).optional(),
})

export const integrationCallbackQuerySchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1),
})
