import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

import * as schema from './schema'

export const getDb = (d1: D1Database) => drizzle(d1, { schema })

export async function dbCount(
  db: ReturnType<typeof getDb>,
  from: SQLiteTable,
  where?: unknown
): Promise<number> {
  const q = db.select({ value: sql<number>`count(*)` }).from(from)
  const result = where ? await q.where(where as Parameters<typeof q.where>[0]) : await q
  const [row] = result as unknown as { value: number }[]
  return row?.value ?? 0
}
