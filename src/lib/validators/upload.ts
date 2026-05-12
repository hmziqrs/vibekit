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
