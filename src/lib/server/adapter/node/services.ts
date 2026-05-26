import 'dotenv/config'
import { setEmailService } from '$lib/server/auth'
import { createEmailService } from '$lib/server/email'
import type { AppServices } from '$lib/server/services/types'

import { createNodeCache } from './cache'
import { createNodeDb } from './db'
import { createNodeEmail } from './email-rest'
import { readNodeEnv } from './env'
import { createNodeStorage } from './storage-filesystem'
import { createS3Storage } from './storage-s3'

export async function createNodeServices(): Promise<AppServices> {
  const storage = process.env.S3_ENDPOINT ? createS3Storage() : createNodeStorage()
  const emailClient = createNodeEmail()
  const db = await createNodeDb()

  const emailService = createEmailService(emailClient, db)
  setEmailService(emailService)

  return {
    cache: createNodeCache(),
    db,
    email: emailClient,
    env: readNodeEnv(),
    storage,
  }
}
