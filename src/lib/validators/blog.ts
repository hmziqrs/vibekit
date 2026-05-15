import { z } from 'zod/v4'

import { slug } from './common'

const urlOrPath = z
  .string()
  .refine(
    (v) => {
      if (v.startsWith('/')) return true
      try {
        const _ = new URL(v)
        return true
      } catch {
        return false
      }
    },
    { message: 'Invalid URL' }
  )
  .optional()
  .nullable()

export const createPostSchema = z.object({
  canonicalUrl: z.string().url('Invalid URL').optional().nullable(),
  contentBody: z.string().max(100_000, 'Content is too long').optional().nullable(),
  coverImageUrl: urlOrPath,
  excerpt: z.string().max(500, 'Excerpt is too long').trim().optional().nullable(),
  ogImageUrl: urlOrPath,
  seoDescription: z.string().max(500).trim().optional().nullable(),
  seoTitle: z.string().max(200).trim().optional().nullable(),
  seriesIds: z.array(z.object({ id: z.string(), sortOrder: z.number().int().min(0) })).optional(),
  slug,
  status: z.enum(['draft', 'published', 'archived', 'scheduled']).default('draft'),
  tagIds: z.array(z.string()).optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').trim(),
})

export const updatePostSchema = z.object({
  canonicalUrl: z.string().url().optional().nullable(),
  contentBody: z.string().max(100_000).optional().nullable(),
  coverImageUrl: urlOrPath,
  excerpt: z.string().max(500).trim().optional().nullable(),
  ogImageUrl: urlOrPath,
  scheduledAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((v) => {
      if (v) return new Date(v)
      if (v === null) return null
      return undefined
    }),
  seoDescription: z.string().max(500).trim().optional().nullable(),
  seoTitle: z.string().max(200).trim().optional().nullable(),
  seriesIds: z.array(z.object({ id: z.string(), sortOrder: z.number().int().min(0) })).optional(),
  slug: slug.optional(),
  status: z.enum(['draft', 'published', 'archived', 'scheduled']).optional(),
  tagIds: z.array(z.string()).optional(),
  title: z.string().min(1).max(200).trim().optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>

export const createSeriesSchema = z.object({
  coverImageUrl: z.string().url().optional().nullable(),
  description: z.string().max(1000).trim().optional().nullable(),
  name: z.string().min(1, 'Name is required').max(200).trim(),
  slug,
})

export const updateSeriesSchema = z.object({
  coverImageUrl: z.string().url().optional().nullable(),
  description: z.string().max(1000).trim().optional().nullable(),
  name: z.string().min(1).max(200).trim().optional(),
  slug: slug.optional(),
})

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(100),
})

export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required').max(100),
})

export const linkPreviewSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .url('Invalid URL format')
    .refine(
      (val) => val.startsWith('https://') || val.startsWith('http://'),
      'URL must use http or https protocol'
    )
    .refine((val) => {
      try {
        const parsed = new URL(val)
        const hostname = parsed.hostname.toLowerCase()
        const blockedHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1',
          '169.254.169.254',
          'metadata.google.internal',
        ]
        if (blockedHosts.includes(hostname)) return false
        // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
        if (
          hostname.match(/^10\./) ||
          hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\./) ||
          hostname.match(/^192\.168\./)
        ) {
          return false
        }
        return true
      } catch {
        return false
      }
    }, 'URL must not point to internal or private addresses'),
})

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>
