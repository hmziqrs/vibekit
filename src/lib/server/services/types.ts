import type { createNodeDb } from '../adapter/node/db'
import type { getDb } from '../db'

export type AppDb = ReturnType<typeof getDb> | Awaited<ReturnType<typeof createNodeDb>>

export interface StoredObject {
  body: ReadableStream
  contentType: string
  cacheControl?: string
  size?: number
  etag?: string
}

export interface PutOptions {
  contentType?: string
  cacheControl?: string
  metadata?: Record<string, string>
}

export interface PutResult {
  key: string
  url: string
  size: number
  contentType: string
}

export interface ListObjectSummary {
  key: string
  size: number
  contentType?: string
  lastModified?: string
}

export interface ListResult {
  items: ListObjectSummary[]
  nextCursor?: string
  truncated: boolean
}

export interface PresignedUrlOptions {
  expiresIn?: number // seconds, default 3600
  contentType?: string
}

export interface StorageClient {
  put(key: string, body: ReadableStream | Uint8Array | Blob, opts?: PutOptions): Promise<PutResult>
  get(key: string): Promise<StoredObject | null>
  delete(key: string): Promise<void>
  list(prefix?: string, cursor?: string, limit?: number): Promise<ListResult>
  getPresignedUrl(key: string, options?: PresignedUrlOptions): Promise<string>
}

export interface EmailMessage {
  to: string | string[]
  from: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export type EmailResult =
  | { ok: true; delivered: string[]; queued?: string[] }
  | { ok: false; reason: string }

export interface EmailClient {
  send(message: EmailMessage): Promise<EmailResult>
}

export interface CacheClient {
  purgeBlog(slug?: string): Promise<void>
}

export interface RuntimeEnv {
  origin: string
  betterAuthSecret: string
  cronSecret: string
  contactNotificationEmail?: string
  publicCfWebAnalyticsToken?: string
  publicFirebaseConfig?: string
}

export interface AppServices {
  db: AppDb
  storage: StorageClient
  email: EmailClient
  cache: CacheClient
  env: RuntimeEnv
}
