import { z } from 'zod/v4'

import { email, name } from './common'

export const contactSchema = z.object({
  name,
  email,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long').trim(),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long')
    .trim(),
})

export type ContactInput = z.infer<typeof contactSchema>
