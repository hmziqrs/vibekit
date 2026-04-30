import { randomBytes, scryptSync } from 'node:crypto'
import { spawn } from 'child_process'
import { uuid } from '../src/lib/server/uuid'

const TEST_USER_EMAIL = 'admin@vibekit.local'
const TEST_USER_PASSWORD = 'admin12345678'
const TEST_USER_NAME = 'Test Admin'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password.normalize('NFKC'), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 })
  return `${salt}:${key.toString('hex')}`
}

function runWrangler(sqlLines: string[]): Promise<number> {
  const sql = sqlLines.join('\n') + '\n'
  return new Promise((resolve) => {
    const proc = spawn('npx', ['wrangler', 'd1', 'execute', 'vibekit-db', '--local', '--command', sql], {
      stdio: 'inherit',
      shell: false,
    })
    proc.on('close', resolve)
  })
}

async function main() {
  const mode = process.argv[2] ?? 'seed'

  if (mode === 'clean') {
    console.log('Removing test user...')
    const cleanSql = [
      `DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email = '${TEST_USER_EMAIL}');`,
      `DELETE FROM session WHERE user_id IN (SELECT id FROM user WHERE email = '${TEST_USER_EMAIL}');`,
      `DELETE FROM item WHERE user_id IN (SELECT id FROM user WHERE email = '${TEST_USER_EMAIL}');`,
      `DELETE FROM user WHERE email = '${TEST_USER_EMAIL}';`,
    ]
    const ec = await runWrangler(cleanSql)
    if (ec !== 0) throw new Error(`wrangler exited with code ${ec}`)
    console.log('Test user removed.')
    return
  }

  console.log('Hashing password...')
  const passwordHash = hashPassword(TEST_USER_PASSWORD)

  const userId = uuid()
  const accountId = uuid()
  const now = "cast(unixepoch('subsecond') * 1000 as integer)"

  const sqlLines = [
    `INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at, display_name, role, status) VALUES ('${userId}', '${TEST_USER_NAME}', '${TEST_USER_EMAIL}', 1, ${now}, ${now}, '${TEST_USER_NAME}', 'admin', 'active');`,
    `INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ('${accountId}', '${TEST_USER_EMAIL}', 'credential', '${userId}', '${passwordHash}', ${now}, ${now});`,
  ]

  // Seed 2 items so the app/items page has data
  sqlLines.push(
    `INSERT OR IGNORE INTO item (id, user_id, name, description, status, created_at, updated_at) VALUES ('${uuid()}', '${userId}', 'My First Item', 'A test item created by the seed script', 'active', ${now}, ${now});`,
    `INSERT OR IGNORE INTO item (id, user_id, name, description, status, created_at, updated_at) VALUES ('${uuid()}', '${userId}', 'Another Item', 'Second test item for the rendering test suite', 'active', ${now}, ${now});`,
  )

  console.log('Seeding test user via wrangler...')
  const ec = await runWrangler(sqlLines)
  if (ec !== 0) throw new Error(`wrangler exited with code ${ec}`)

  console.log(`Test user seeded: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`)
  console.log('Role: admin | email_verified: true')
}

main().catch(console.error)
