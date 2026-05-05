import { json } from '@sveltejs/kit'
import { sql } from 'drizzle-orm'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  const start = Date.now()

  let db = 'error'
  try {
    if (locals.services) {
      await locals.services.db.run(sql`SELECT 1`)
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
