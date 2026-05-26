import { z } from 'zod/v4'

import { email } from './common'

export const waitlistSchema = z.object({
  email,
})
