import { z } from 'zod/v4'

export const recordViewSchema = z.object({
  postId: z.string().trim().min(1).max(200),
  referrer: z.string().trim().max(500).optional(),
})

export const recordReadingSchema = z.object({
  postId: z.string().trim().min(1).max(200),
  progress: z.number().int().min(0).max(100),
  readTime: z.number().int().min(0),
})
