import { z } from 'zod/v4'

import { slug } from './common'

export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').trim(),
  slug,
  excerpt: z.string().max(500, 'Excerpt is too long').trim().optional().nullable(),
  contentBody: z.string().max(100000, 'Content is too long').optional().nullable(),
  coverImageUrl: z.string().url('Invalid URL').optional().nullable(),
  seoTitle: z.string().max(200).trim().optional().nullable(),
  seoDescription: z.string().max(500).trim().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tagIds: z.array(z.string()).optional(),
})

export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  slug: slug.optional(),
  excerpt: z.string().max(500).trim().optional().nullable(),
  contentBody: z.string().max(100000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().max(200).trim().optional().nullable(),
  seoDescription: z.string().max(500).trim().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tagIds: z.array(z.string()).optional(),
})

export const publishPostSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type PublishPostInput = z.infer<typeof publishPostSchema>
