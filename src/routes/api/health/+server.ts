import { json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ platform }) => {
  const start = Date.now()

  let db: string
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
    ok: db === 'connected',
    db,
    time: new Date().toISOString(),
    responseTime: Date.now() - start,
  })
}
