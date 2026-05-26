import { and, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'

import { NotFoundError } from '../errors'
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

// oxlint-disable-next-line max-params
export async function findByIdOrThrow<T extends SQLiteTable>(
  db: ReturnType<typeof getDb>,
  table: T,
  id: string,
  options?: { message?: string; where?: unknown }
): Promise<T['$inferSelect']> {
  const baseCondition = eq((table as Record<string, unknown>)['id'] as never, id)
  const whereClause = options?.where ? and(baseCondition, options.where as never) : baseCondition
  const row = await db.select().from(table).where(whereClause).get()
  if (!row) throw new NotFoundError(options?.message)
  return row as T['$inferSelect']
}
