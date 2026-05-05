import { rateLimit } from '$lib/server/rate-limit'
import { generateStorageKey, validateImageUpload } from '$lib/server/upload'
import { json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed } = rateLimit(`upload:${locals.user.id}`, 10, 60_000)
  if (!allowed) {
    return json({ error: 'Too many upload requests' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return json({ error: 'No file provided' }, { status: 400 })
  }

  const validationError = validateImageUpload(file)
  if (validationError) {
    return json({ error: validationError }, { status: 400 })
  }

  const key = generateStorageKey(file.name)
  const result = await locals.services.storage.put(key, file.stream(), {
    contentType: file.type,
  })

  return json({ key: result.key, url: result.url }, { status: 201 })
}
