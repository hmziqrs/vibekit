import { json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, platform }) => {
  const bucket = platform?.env?.R2_BLOG_MEDIA
  if (!bucket) {
    return json({ error: 'Storage not configured' }, { status: 500 })
  }

  const key = params.key
  if (!key || key.includes('..')) {
    return json({ error: 'Invalid key' }, { status: 400 })
  }

  const object = await bucket.get(key)
  if (!object) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  const headers = new Headers()
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')

  if (object.httpMetadata?.cacheControl) {
    headers.set('Cache-Control', object.httpMetadata.cacheControl)
  }
  if (object.size) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body, { headers })
}
