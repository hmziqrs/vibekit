import { z } from 'zod/v4'

import { slug } from './common'

export const createPostSchema = z.object({
  contentBody: z.string().max(100_000, 'Content is too long').optional().nullable(),
  coverImageUrl: z.string().url('Invalid URL').optional().nullable(),
  excerpt: z.string().max(500, 'Excerpt is too long').trim().optional().nullable(),
  seoDescription: z.string().max(500).trim().optional().nullable(),
  seoTitle: z.string().max(200).trim().optional().nullable(),
  slug,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tagIds: z.array(z.string()).optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').trim(),
})

export const updatePostSchema = z.object({
  contentBody: z.string().max(100_000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  excerpt: z.string().max(500).trim().optional().nullable(),
  seoDescription: z.string().max(500).trim().optional().nullable(),
  seoTitle: z.string().max(200).trim().optional().nullable(),
  slug: slug.optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tagIds: z.array(z.string()).optional(),
  title: z.string().min(1).max(200).trim().optional(),
})

export const publishPostSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type PublishPostInput = z.infer<typeof publishPostSchema>
