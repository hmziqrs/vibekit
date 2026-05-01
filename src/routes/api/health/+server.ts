import { json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ platform }) => {
  const start = Date.now()

  let db = 'error'
  try {
    const d1 = platform?.env?.DB
    if (d1) {
      await d1.prepare('SELECT 1').first()
      db = 'connected'
    } else {
      db = 'unavailable'
    }
  } catch {
    db = 'error'
  }

  return json({
    db,
    ok: db === 'connected',
    responseTime: Date.now() - start,
    time: new Date().toISOString(),
  })
}
