import { z } from 'zod/v4'
import { name, slug } from './common'

export const createItemSchema = z.object({
  name,
  description: z.string().max(2000, 'Description must be at most 2000 characters').trim().optional(),
})

export const updateItemSchema = z.object({
  name: name.optional(),
  description: z.string().max(2000, 'Description must be at most 2000 characters').trim().optional(),
  status: z.enum(['active', 'archived']).optional(),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
