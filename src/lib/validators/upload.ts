import { z } from 'zod/v4'

export const createUploadSessionSchema = z.object({
  chunkSize: z.number().int().min(1_048_576).max(52_428_800),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().min(1).max(524_288_000),
  fileType: z.string().trim().min(1).max(100),
})

export const chunkUploadSchema = z.object({
  chunkIndex: z.number().int().min(0),
})

export const listUploadSessionsSchema = z.object({
  status: z.enum(['complete', 'expired', 'failed', 'pending', 'uploading']).optional(),
})

export const bulkDeleteMediaSchema = z.object({
  keys: z
    .array(z.string().min(1))
    .min(1, 'Must provide at least one key')
    .max(100, 'Maximum 100 keys per request'),
})

export const storagePresignGetSchema = z.object({
  key: z.string().trim().min(1).max(1024),
})

export const storagePresignPutSchema = z.object({
  contentType: z.string().trim().min(1).max(200).optional(),
  key: z.string().trim().min(1).max(1024),
})

export const storageThumbnailSchema = z.object({
  height: z.coerce.number().int().min(50).max(2000).optional(),
  key: z.string().trim().min(1).max(1024),
  width: z.coerce.number().int().min(50).max(2000).optional(),
})
