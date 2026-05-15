import { z } from 'zod/v4'

import { email, name } from './common'

export const contactSchema = z.object({
  email,
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long'),
  name,
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject is too long'),
})

export const appealSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  name: z.string().trim().min(1, 'Name is required').max(100),
})
