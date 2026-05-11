import { z } from 'zod/v4'

import { displayName, name } from './common'

export const bio = z.string().max(500, 'Bio must be at most 500 characters').optional().nullable()

export const timezone = z.string().max(50, 'Invalid timezone').optional().nullable()

export const updateProfileSchema = z.object({
  bio,
  displayName,
  name,
  timezone,
})
