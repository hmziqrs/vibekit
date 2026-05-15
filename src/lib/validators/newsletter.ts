import { z } from 'zod/v4'

import { email } from './common'

export const subscribeSchema = z.object({
  email,
  name: z.string().max(200).trim().optional(),
  source: z.enum(['blog', 'footer', 'post']).default('blog'),
})

export const unsubscribeSchema = z.object({
  token: z.string().max(100).optional(),
})

export type SubscribeInput = z.infer<typeof subscribeSchema>
