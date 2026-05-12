import { z } from 'zod/v4'

export const searchSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  query: z.string().trim().min(1).max(500),
  types: z.array(z.string().trim().min(1)).max(10).optional(),
})

export const indexDocumentSchema = z.object({
  content: z.string().min(1).max(50_000),
  entityId: z.string().trim().min(1).max(200),
  entityType: z.string().trim().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
  title: z.string().trim().min(1).max(500),
})

export const deleteIndexSchema = z.object({
  entityId: z.string().trim().min(1),
  entityType: z.string().trim().min(1),
})

export const reindexSchema = z.object({
  entityType: z.enum(['blog_post', 'comment', 'item', 'page', 'user']).optional(),
})

export const deleteSearchIndexSchema = z.object({
  entityId: z.string().trim().min(1, 'Entity ID is required'),
  entityType: z.string().trim().min(1, 'Entity type is required'),
})
