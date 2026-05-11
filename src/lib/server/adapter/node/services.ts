import 'dotenv/config'

import type { AppServices } from '../../services/types'
import { createNodeCache } from './cache'
import { createNodeDb } from './db'
import { createNodeEmail } from './email-rest'
import { readNodeEnv } from './env'
import { createNodeStorage } from './storage-filesystem'
import { createS3Storage } from './storage-s3'

export async function createNodeServices(): Promise<AppServices> {
  const storage = process.env.S3_ENDPOINT ? createS3Storage() : createNodeStorage()

  return {
    cache: createNodeCache(),
    db: await createNodeDb(),
    email: createNodeEmail(),
    env: readNodeEnv(),
    storage,
  }
}
