import { createLogger } from '$lib/server/logger'
import type {
  ListResult,
  PutOptions,
  PutResult,
  StorageClient,
  StoredObject,
} from '$lib/server/services/types'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const logger = createLogger('storage-s3')

export function createS3Storage(): StorageClient {
  const endpoint = process.env.S3_ENDPOINT ?? ''
  const accessKey = process.env.S3_ACCESS_KEY ?? ''
  const secretKey = process.env.S3_SECRET_KEY ?? ''
  const bucket = process.env.S3_BUCKET ?? 'vibekit-media'
  const region = process.env.S3_REGION ?? 'auto'

  const client = new S3Client({
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    endpoint,
    forcePathStyle: true,
    region,
  })

  return {
    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    },

    async get(key: string): Promise<StoredObject | null> {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        if (!result.Body) return null
        return {
          body: result.Body.transformToWebStream(),
          cacheControl: result.CacheControl,
          contentType: result.ContentType ?? 'application/octet-stream',
          etag: result.ETag ?? undefined,
          size: result.ContentLength ?? undefined,
        }
      } catch (error) {
        logger.error('S3 get failed', { error, key })
        return null
      }
    },

    async getPresignedUrl(
      key: string,
      options?: { contentType?: string; expiresIn?: number }
    ): Promise<string> {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: options?.expiresIn ?? 3600,
      })
    },

    async list(prefix?: string, cursor?: string, limit?: number): Promise<ListResult> {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
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
          Bucket: bucket,
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

    async putPresignedUrl(
      key: string,
      options?: { contentType?: string; expiresIn?: number }
    ): Promise<string> {
      return getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          ContentType: options?.contentType,
          Key: key,
        }),
        { expiresIn: options?.expiresIn ?? 3600 }
      )
    },
  }
}
