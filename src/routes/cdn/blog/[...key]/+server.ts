import { json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals }) => {
  const { key } = params
  if (!key || key.includes('..')) {
    return json({ error: 'Invalid key' }, { status: 400 })
  }

  const object = await locals.services.storage.get(key)
  if (!object) {
    return json({ error: 'Not found' }, { status: 404 })
  }

  const headers = new Headers()
  headers.set('Cache-Control', object.cacheControl ?? 'public, max-age=31536000, immutable')
  headers.set('Content-Type', object.contentType)

  if (object.size) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body, { headers })
}
