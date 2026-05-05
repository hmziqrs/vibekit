import type { RequestEvent } from '@sveltejs/kit'

import { getDb } from '../../db'
import type { AppServices } from '../../services/types'
import { createCloudflareCache } from './cache'
import { createCloudflareEmail } from './email-binding'
import { readCloudflareEnv } from './env'
import { createCloudflareStorage } from './storage-r2'

export function createCloudflareServices(event: RequestEvent): AppServices {
  const { platform } = event
  const { env } = platform!

  return {
    cache: createCloudflareCache(platform),
    db: getDb(env.DB),
    email: createCloudflareEmail(env.SEND_EMAIL),
    env: readCloudflareEnv(env),
    storage: createCloudflareStorage(env.R2_BLOG_MEDIA),
  }
}
