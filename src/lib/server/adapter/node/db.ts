import * as schema from '../../db/schema'

const DB_PATH = process.env.DATABASE_PATH ?? 'data/vibekit.db'

let _db: ReturnType<typeof createNodeDb> | undefined

export function createNodeDb() {
  if (_db) return _db

  // Dynamic import: bun:sqlite is only available in the Bun runtime.
  // This avoids Node/Rollup trying to resolve it at build time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Database } = require('bun:sqlite')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/bun-sqlite')

  // Ensure parent directory exists for fresh deployments
  const { mkdirSync } = require('node:fs')
  const { dirname } = require('node:path')
  mkdirSync(dirname(DB_PATH), { recursive: true })

  const sqlite = new Database(DB_PATH, { create: true })

  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec('PRAGMA busy_timeout = 5000')

  _db = drizzle(sqlite, { schema })
  return _db
}
