import { randomBytes, scryptSync } from 'node:crypto'
import { spawn } from 'child_process'
import { uuid } from '../src/lib/server/uuid'

const TEST_USERS = [
  { email: 'admin@vibekit.local', password: 'admin12345678', name: 'Test Admin', role: 'admin' as const },
  { email: 'user@vibekit.local', password: 'user12345678', name: 'Test User', role: 'user' as const },
]

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
    console.log('Removing test users...')
    const emails = TEST_USERS.map((u) => u.email)
    const cleanSql = emails.flatMap((email) => [
      `DELETE FROM account WHERE user_id IN (SELECT id FROM user WHERE email = '${email}');`,
      `DELETE FROM session WHERE user_id IN (SELECT id FROM user WHERE email = '${email}');`,
      `DELETE FROM item WHERE user_id IN (SELECT id FROM user WHERE email = '${email}');`,
      `DELETE FROM user WHERE email = '${email}';`,
    ])
    const ec = await runWrangler(cleanSql)
    if (ec !== 0) throw new Error(`wrangler exited with code ${ec}`)
    console.log('Test users removed.')
    return
  }

  const now = "cast(unixepoch('subsecond') * 1000 as integer)"
  const sqlLines: string[] = []
  const adminUserId = uuid()

  for (const u of TEST_USERS) {
    console.log(`Hashing password for ${u.email}...`)
    const passwordHash = hashPassword(u.password)
    const userId = u.role === 'admin' ? adminUserId : uuid()
    const accountId = uuid()

    sqlLines.push(
      `INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at, display_name, role, status) VALUES ('${userId}', '${u.name}', '${u.email}', 1, ${now}, ${now}, '${u.name}', '${u.role}', 'active');`,
      `INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ('${accountId}', '${u.email}', 'credential', '${userId}', '${passwordHash}', ${now}, ${now});`,
    )

    // Seed 2 items for admin so the app/items page has data
    if (u.role === 'admin') {
      sqlLines.push(
        `INSERT OR IGNORE INTO item (id, user_id, name, description, status, created_at, updated_at) VALUES ('${uuid()}', '${userId}', 'My First Item', 'A test item created by the seed script', 'active', ${now}, ${now});`,
        `INSERT OR IGNORE INTO item (id, user_id, name, description, status, created_at, updated_at) VALUES ('${uuid()}', '${userId}', 'Another Item', 'Second test item for the rendering test suite', 'active', ${now}, ${now});`,
      )
    }
  }

  console.log('Seeding test users via wrangler...')
  const ec = await runWrangler(sqlLines)
  if (ec !== 0) throw new Error(`wrangler exited with code ${ec}`)

  for (const u of TEST_USERS) {
    console.log(`${u.role}: ${u.email} / ${u.password}`)
  }
}

main().catch(console.error)
