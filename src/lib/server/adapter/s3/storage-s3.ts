import { createHmac, type createHash } from 'node:crypto'

import type {
  ListResult,
  PutOptions,
  PutResult,
  StorageClient,
  StoredObject,
} from '$lib/server/services/types'

interface S3Config {
  accessKeyId: string
  bucket: string
  endpoint: string
  publicUrl?: string
  region: string
  secretAccessKey: string
}

export function createS3Storage(config: S3Config): StorageClient {
  const baseUrl = config.endpoint.replace(/\/$/, '')
  const publicBase = config.publicUrl ?? baseUrl

  async function signRequest(method: string, path: string, headers: Record<string, string>) {
    const date = new Date()
    const dateStr = date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d+Z$/, 'Z')
    const shortDate = dateStr.slice(0, 8)

    const canonicalHeaders = Object.entries(headers)
      .map(([k, v]) => `${k.toLowerCase()}:${v}`)
      .toSorted()
      .join('\n')
    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .toSorted()
      .join(';')

    const canonical = [
      method,
      path,
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n')

    const scope = `${shortDate}/${config.region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', dateStr, scope, sha256Hex(canonical)].join('\n')

    const signingKey = hmacChain(
      `AWS4${config.secretAccessKey}`,
      shortDate,
      config.region,
      's3',
      'aws4_request'
    )

    const signature = hmacHex(signingKey, stringToSign)
    return `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }

  // oxlint-disable-next-line sort-keys
  return {
    async delete(key: string): Promise<void> {
      const path = `/${config.bucket}/${key}`
      const { host } = new URL(baseUrl)
      const headers: Record<string, string> = { host }
      const auth = await signRequest('DELETE', path, headers)
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { ...headers, authorization: auth },
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        throw new Error(`S3 DELETE failed: ${res.status}`)
      }
    },

    async get(key: string): Promise<StoredObject | null> {
      const path = `/${config.bucket}/${key}`
      const { host } = new URL(baseUrl)
      const headers: Record<string, string> = { host }
      const auth = await signRequest('GET', path, headers)
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { ...headers, authorization: auth },
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`S3 GET failed: ${res.status}`)

      return {
        body: res.body as ReadableStream,
        cacheControl: res.headers.get('cache-control') ?? undefined,
        contentType: res.headers.get('content-type') ?? 'application/octet-stream',
        size: Number(res.headers.get('content-length') ?? '0'),
      }
    },

    async getPresignedUrl(
      key: string,
      options?: { contentType?: string; expiresIn?: number }
    ): Promise<string> {
      const expires = options?.expiresIn ?? 3600
      const date = new Date()
      const shortDate = date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d+Z$/, 'Z')
        .slice(0, 8)

      const credential = `${config.accessKeyId}/${shortDate}/${config.region}/s3/aws4_request`
      const params = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': shortDate,
        'X-Amz-Expires': String(expires),
        'X-Amz-SignedHeaders': 'host',
      })

      const { host } = new URL(baseUrl)
      const path = `/${config.bucket}/${key}`
      const canonical = [
        'GET',
        path,
        params.toString(),
        `host:${host}`,
        '',
        'host',
        'UNSIGNED-PAYLOAD',
      ].join('\n')

      const signingKey = hmacChain(
        `AWS4${config.secretAccessKey}`,
        shortDate,
        config.region,
        's3',
        'aws4_request'
      )
      const signature = hmacHex(signingKey, canonical)

      params.set('X-Amz-Signature', signature)
      return `${baseUrl}${path}?${params}`
    },

    async putPresignedUrl(
      key: string,
      options?: { contentType?: string; expiresIn?: number }
    ): Promise<string> {
      const expires = options?.expiresIn ?? 3600
      const date = new Date()
      const dateStr = date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d+Z$/, 'Z')
      const shortDate = dateStr.slice(0, 8)

      const credential = `${config.accessKeyId}/${shortDate}/${config.region}/s3/aws4_request`
      const signedHeadersList = ['host', 'content-type']
      const { host } = new URL(baseUrl)
      const contentType = options?.contentType ?? 'application/octet-stream'

      const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`
      const signedHeaders = signedHeadersList.join(';')

      const params = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': dateStr,
        'X-Amz-Expires': String(expires),
        'X-Amz-SignedHeaders': signedHeaders,
      })

      const path = `/${config.bucket}/${key}`
      const canonical = [
        'PUT',
        path,
        params.toString(),
        canonicalHeaders,
        '',
        signedHeaders,
        'UNSIGNED-PAYLOAD',
      ].join('\n')

      const scope = `${shortDate}/${config.region}/s3/aws4_request`
      const stringToSign = ['AWS4-HMAC-SHA256', dateStr, scope, sha256Hex(canonical)].join('\n')

      const signingKey = hmacChain(
        `AWS4${config.secretAccessKey}`,
        shortDate,
        config.region,
        's3',
        'aws4_request'
      )
      const signature = hmacHex(signingKey, stringToSign)

      params.set('X-Amz-Signature', signature)
      return `${baseUrl}${path}?${params}`
    },

    async list(prefix?: string, _cursor?: string, limit = 100): Promise<ListResult> {
      const params = new URLSearchParams({
        'list-type': '2',
        ...(prefix ? { prefix } : {}),
        'max-keys': String(limit),
      })
      const path = `/${config.bucket}?${params}`
      const { host } = new URL(baseUrl)
      const headers: Record<string, string> = { host }
      const auth = await signRequest('GET', path, headers)
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { ...headers, authorization: auth },
      })
      if (!res.ok) throw new Error(`S3 LIST failed: ${res.status}`)

      const text = await res.text()
      const items: ListResult['items'] = []
      const keyMatches = text.matchAll(/<Key>([^<]+)<\/Key>/g)
      const sizeMatches = text.matchAll(/<Size>([^<]+)<\/Size>/g)
      const modifiedMatches = text.matchAll(/<LastModified>([^<]+)<\/LastModified>/g)

      const keys = [...keyMatches]
      const sizes = [...sizeMatches]
      const modifieds = [...modifiedMatches]

      for (let i = 0; i < keys.length; i++) {
        items.push({
          key: keys[i][1],
          lastModified: modifieds[i]?.[1],
          size: Number(sizes[i]?.[1] ?? '0'),
        })
      }

      const isTruncated = text.includes('<IsTruncated>true</IsTruncated>')
      const nextTokenMatch = text.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)

      return {
        items,
        nextCursor: isTruncated && nextTokenMatch ? nextTokenMatch[1] : undefined,
        truncated: isTruncated,
      }
    },

    async put(
      key: string,
      body: ReadableStream | Uint8Array | Blob,
      opts?: PutOptions
    ): Promise<PutResult> {
      const path = `/${config.bucket}/${key}`
      const { host } = new URL(baseUrl)

      let bytes: Uint8Array
      if (body instanceof Uint8Array) {
        bytes = body
      } else if (body instanceof Blob) {
        bytes = new Uint8Array(await body.arrayBuffer())
      } else {
        const chunks: Uint8Array[] = []
        const reader = body.getReader()
        // eslint-disable-next-line no-constant-condition
        while (true) {
          // oxlint-disable-next-line no-await-in-loop
          const { done, value } = await reader.read()
          if (done) break
          if (value) chunks.push(value)
        }
        bytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
      }

      const headers: Record<string, string> = {
        'content-length': String(bytes.length),
        'content-type': opts?.contentType ?? 'application/octet-stream',
        host,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      }
      if (opts?.cacheControl) headers['cache-control'] = opts.cacheControl

      const auth = await signRequest('PUT', path, headers)
      const res = await fetch(`${baseUrl}${path}`, {
        body: new Blob([bytes.buffer] as BlobPart[]),
        headers: { ...headers, authorization: auth },
        method: 'PUT',
      })
      if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`)

      return {
        contentType: opts?.contentType ?? 'application/octet-stream',
        key,
        size: bytes.length,
        url: `${publicBase}/${config.bucket}/${key}`,
      }
    },
  }
}

function sha256Hex(data: string): string {
  const crypto = require('node:crypto') as { createHash: typeof createHash }
  return crypto.createHash('sha256').update(data).digest('hex')
}

function hmacChain(...parts: string[]): Buffer {
  const { createHmac: hmacFn } = require('node:crypto') as { createHmac: typeof createHmac }
  let key = Buffer.from(parts[0], 'utf8')
  for (let i = 1; i < parts.length; i++) {
    key = hmacFn('sha256', key).update(parts[i]).digest()
  }
  return key
}

function hmacHex(key: Buffer | string, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}
