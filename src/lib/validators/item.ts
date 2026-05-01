import { z } from 'zod/v4'

import { name, slug } from './common'

export const createItemSchema = z.object({
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .optional(),
  name,
})

export const updateItemSchema = z.object({
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .optional(),
  name: name.optional(),
  status: z.enum(['active', 'archived']).optional(),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
