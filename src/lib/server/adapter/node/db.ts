import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import * as schema from '$lib/server/db/schema'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'

const DB_PATH = process.env.DATABASE_PATH ?? 'data/vibekit.db'

type NodeDb = BunSQLiteDatabase<typeof schema> | BetterSQLite3Database<typeof schema>

let _db: NodeDb | undefined

export async function createNodeDb(): Promise<NodeDb> {
  if (_db) return _db

  mkdirSync(dirname(DB_PATH), { recursive: true })

  const isBun = 'Bun' in globalThis

  if (isBun) {
    const { Database } = await import('bun:sqlite')
    const { drizzle } = await import('drizzle-orm/bun-sqlite')
    const sqlite = new Database(DB_PATH, { create: true })
    sqlite.exec('PRAGMA journal_mode = WAL')
    sqlite.exec('PRAGMA foreign_keys = ON')
    sqlite.exec('PRAGMA busy_timeout = 5000')
    _db = drizzle(sqlite, { schema })
  } else {
    const { default: Database } = await import('better-sqlite3')
    const { drizzle } = await import('drizzle-orm/better-sqlite3')
    const sqlite = new Database(DB_PATH)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')
    _db = drizzle(sqlite, { schema })
  }

  return _db
}
