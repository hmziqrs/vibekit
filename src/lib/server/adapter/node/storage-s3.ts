import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import type {
  ListResult,
  PutOptions,
  PutResult,
  StorageClient,
  StoredObject,
} from '../../services/types'

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? ''
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? ''
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? ''
const S3_BUCKET = process.env.S3_BUCKET ?? 'vibekit-media'
const S3_REGION = process.env.S3_REGION ?? 'auto'

export function createS3Storage(): StorageClient {
  const client = new S3Client({
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    region: S3_REGION,
  })

  return {
    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
    },

    async get(key: string): Promise<StoredObject | null> {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
        if (!result.Body) return null
        return {
          body: result.Body.transformToWebStream(),
          cacheControl: result.CacheControl,
          contentType: result.ContentType ?? 'application/octet-stream',
          etag: result.ETag ?? undefined,
          size: result.ContentLength ?? undefined,
        }
      } catch {
        return null
      }
    },

    async list(prefix?: string, cursor?: string, limit?: number): Promise<ListResult> {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: S3_BUCKET,
          ContinuationToken: cursor || undefined,
          MaxKeys: limit ?? 100,
          Prefix: prefix || undefined,
        })
      )

      const items =
        result.Contents?.map((obj) => ({
          contentType: undefined,
          key: obj.Key ?? '',
          lastModified: obj.LastModified?.toISOString(),
          size: obj.Size ?? 0,
        })) ?? []

      return {
        items,
        nextCursor: result.NextContinuationToken ?? undefined,
        truncated: result.IsTruncated ?? false,
      }
    },

    async put(
      key: string,
      body: ReadableStream | Uint8Array | Blob,
      opts?: PutOptions
    ): Promise<PutResult> {
      let bytes: Uint8Array
      if (body instanceof Uint8Array) {
        bytes = body
      } else if (body instanceof Blob) {
        bytes = new Uint8Array(await body.arrayBuffer())
      } else {
        const chunks: Uint8Array[] = []
        const reader = body.getReader()
        try {
          while (true) {
            // oxlint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
        } finally {
          reader.releaseLock()
        }
        bytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
      }

      await client.send(
        new PutObjectCommand({
          Body: bytes,
          Bucket: S3_BUCKET,
          CacheControl: opts?.cacheControl,
          ContentType: opts?.contentType,
          Key: key,
          Metadata: opts?.metadata,
        })
      )

      return {
        contentType: opts?.contentType ?? 'application/octet-stream',
        key,
        size: bytes.length,
        url: `/cdn/blog/${key}`,
      }
    },
  }
}
