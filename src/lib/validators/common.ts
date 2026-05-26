import { z } from 'zod/v4'

export const email = z.email('Please enter a valid email address').max(254, 'Email is too long')

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((val) => /[A-Z]/.test(val), 'Include at least one uppercase letter')
  .refine((val) => /[a-z]/.test(val), 'Include at least one lowercase letter')
  .refine((val) => /[0-9]/.test(val), 'Include at least one number')

export const name = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters')

export const slug = z
  .string()
  .min(1, 'Slug is required')
  .max(200, 'Slug must be at most 200 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')

export const displayName = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(100, 'Display name must be at most 100 characters')
  .optional()
  .nullable()
