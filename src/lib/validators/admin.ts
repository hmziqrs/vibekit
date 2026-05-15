import { z } from 'zod/v4'

export const banUserSchema = z.object({
  durationDays: z.number().int().min(1).max(3650).optional(),
  reason: z.string().trim().min(1, 'Ban reason is required').max(1000),
})

export const impersonateUserSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(500),
})

export const stopImpersonateSchema = z.object({
  sessionToken: z.string().trim().min(1, 'Session token is required').max(500),
})

export const broadcastNotificationSchema = z.object({
  body: z.string().trim().max(1000).optional(),
  link: z.string().trim().url().optional(),
  target: z.enum(['all', 'admins']),
  title: z.string().trim().min(1, 'Title is required').max(200),
  type: z.enum(['error', 'info', 'success', 'warning']).default('info'),
})
