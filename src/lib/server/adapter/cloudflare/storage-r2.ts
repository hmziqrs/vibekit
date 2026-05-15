import type {
  ListResult,
  PutOptions,
  PutResult,
  StorageClient,
  StoredObject,
} from '../../services/types'

interface R2BucketWithSignedUrl extends R2Bucket {
  createSignedUrl(key: string, options: { expiresIn: number }): Promise<string>
}

export function createCloudflareStorage(bucket: R2Bucket): StorageClient {
  const signedBucket = bucket as R2BucketWithSignedUrl
  return {
    async delete(key: string): Promise<void> {
      await bucket.delete(key)
    },

    async get(key: string): Promise<StoredObject | null> {
      const object = await bucket.get(key)
      if (!object) return null
      return {
        body: object.body as ReadableStream,
        cacheControl: object.httpMetadata?.cacheControl,
        contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
        etag: object.etag,
        size: object.size,
      }
    },

    async getPresignedUrl(
      key: string,
      options?: { contentType?: string; expiresIn?: number }
    ): Promise<string> {
      const url = await signedBucket.createSignedUrl(key, {
        expiresIn: options?.expiresIn ?? 3600,
      })
      return url
    },

    async list(prefix?: string, cursor?: string, limit?: number): Promise<ListResult> {
      const listed = await bucket.list({
        cursor: cursor || undefined,
        limit: limit ?? 100,
        prefix: prefix || undefined,
      })

      return {
        items: listed.objects.map((obj) => ({
          contentType: obj.httpMetadata?.contentType ?? undefined,
          key: obj.key,
          lastModified: obj.uploaded.toISOString(),
          size: obj.size,
        })),
        nextCursor: listed.truncated ? listed.cursor : undefined,
        truncated: listed.truncated,
      }
    },

    async put(
      key: string,
      body: ReadableStream | Uint8Array | Blob,
      opts?: PutOptions
    ): Promise<PutResult> {
      await bucket.put(key, body, {
        customMetadata: opts?.metadata,
        httpMetadata: {
          cacheControl: opts?.cacheControl,
          contentType: opts?.contentType,
        },
      })
      return {
        contentType: opts?.contentType ?? 'application/octet-stream',
        key,
        size: 0,
        url: `/cdn/blog/${key}`,
      }
    },

    async putPresignedUrl(): Promise<string> {
      throw new Error(
        'R2 Workers binding does not support presigned PUT URLs. Use server-side bucket.put() or S3 API credentials.'
      )
    },
  }
}
