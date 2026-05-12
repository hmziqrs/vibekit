import { z } from 'zod/v4'

export const updateConfigSchema = z.object({
  value: z.string().min(1, 'Value is required'),
})

export const createAnnouncementSchema = z.object({
  endsAt: z.string().datetime({ offset: true }).optional(),
  isActive: z.boolean().optional(),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(500, 'Message must be at most 500 characters')
    .trim(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  type: z.enum(['critical', 'info', 'warning']).default('info'),
})

export const updateAnnouncementSchema = z.object({
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  isActive: z.boolean().optional(),
  message: z.string().min(1).max(500).trim().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  type: z.enum(['critical', 'info', 'warning']).optional(),
})

export const resolveConfigSchema = z.object({
  keys: z.array(z.string()).default([]),
})
