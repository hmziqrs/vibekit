import { z } from 'zod/v4'

import { displayName, name } from './common'

export { displayName, name }

export const bio = z.string().max(500, 'Bio must be at most 500 characters').optional().nullable()

export const timezone = z.string().max(50, 'Invalid timezone').optional().nullable()

export const updateProfileSchema = z.object({
  bio,
  displayName,
  name,
  timezone,
})

export const onboardingSchema = z.object({
  completed: z.boolean().optional(),
  step: z
    .number()
    .int()
    .transform((v) => Math.min(Math.max(0, v), 3))
    .optional(),
})

export const reactivateAccountSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

export const notificationPreferenceSchema = z.object({
  channel: z.enum(['email', 'in_app']),
  enabled: z.boolean(),
  type: z.string().min(1, 'Type is required'),
})
