import { z } from 'zod/v4'

export const createReportSchema = z.object({
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .trim()
    .optional(),
  entityId: z.string().trim().min(1, 'Entity ID is required').max(200),
  entityType: z.enum([
    'blogPost',
    'comment',
    'contactSubmission',
    'item',
    'organization',
    'team',
    'user',
  ]),
  reason: z.enum(['harassment', 'inappropriate', 'misinformation', 'other', 'spam']),
})

export const resolveReportSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(1, 'Resolution note is required')
    .max(500, 'Note must be at most 500 characters'),
  status: z.enum(['resolved', 'dismissed']),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
export type ResolveReportInput = z.infer<typeof resolveReportSchema>
