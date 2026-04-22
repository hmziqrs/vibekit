import { rateLimit } from '$lib/server/rate-limit'
import { validateImageUpload, uploadToR2 } from '$lib/server/upload'
import { json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, request, platform }) => {
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

  const bucket = platform?.env?.R2_BLOG_MEDIA
  if (!bucket) {
    return json({ error: 'Storage not configured' }, { status: 500 })
  }

  const result = await uploadToR2(bucket, file)
  return json(result, { status: 201 })
}
