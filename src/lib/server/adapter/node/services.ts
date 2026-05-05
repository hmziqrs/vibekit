import type { AppServices } from '../../services/types'
import { createNodeCache } from './cache'
import { createNodeDb } from './db'
import { createNodeEmail } from './email-rest'
import { readNodeEnv } from './env'
import { createNodeStorage } from './storage-filesystem'

export function createNodeServices(): AppServices {
  return {
    cache: createNodeCache(),
    db: createNodeDb(),
    email: createNodeEmail(),
    env: readNodeEnv(),
    storage: createNodeStorage(),
  }
}
