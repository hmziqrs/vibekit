import { z } from 'zod/v4'

export const imageResizeSchema = z.object({
  fit: z.enum(['contain', 'cover', 'crop', 'scale-down']).optional(),
  format: z.enum(['avif', 'json', 'webp']).optional(),
  height: z.number().int().min(1).max(4096).optional(),
  quality: z.number().int().min(1).max(100).optional(),
  width: z.number().int().min(1).max(4096).optional(),
})
