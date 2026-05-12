import { z } from 'zod/v4'

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment is too long (max 5000 characters)'),
  parentId: z.string().optional(),
})

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment is too long (max 5000 characters)'),
})

export const moderateCommentSchema = z.object({
  status: z.enum(['approved', 'rejected', 'spam']),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>
export type ModerateCommentInput = z.infer<typeof moderateCommentSchema>
