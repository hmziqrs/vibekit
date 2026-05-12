import { z } from 'zod/v4'

export const pushSubscribeSchema = z.object({
  auth: z.string().min(1, 'auth key is required'),
  endpoint: z.string().trim().min(1, 'endpoint is required').url('Invalid endpoint URL'),
  p256dh: z.string().min(1, 'p256dh key is required'),
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().trim().min(1, 'endpoint is required'),
})
