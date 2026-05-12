import { z } from 'zod/v4'

export const API_KEY_SCOPES = [
  'admin',
  'delete:items',
  'read:billing',
  'read:blog',
  'read:items',
  'read:organizations',
  'read:teams',
  'write:billing',
  'write:blog',
  'write:items',
  'write:organizations',
  'write:teams',
] as const

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export const createApiKeySchema = z.object({
  expiresAt: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100),
  rateLimit: z.number().int().min(1).max(10_000).optional(),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1, 'At least one scope is required').max(20),
})

export const updateApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  rateLimit: z.number().int().min(1).max(10_000).optional().nullable(),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).max(20).optional(),
})

export const rotateApiKeySchema = z.object({
  id: z.string().trim().min(1),
})
