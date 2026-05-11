import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('session management configuration', () => {
  it('session table has IP and user agent columns', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('ipAddress')
    expect(schemaSource).toContain('userAgent')
  })

  it('session table has user relation', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('sessionRelations')
    expect(schemaSource).toContain('sessions: many(session)')
  })
})

describe('session management in settings', () => {
  it('has active sessions section', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('Active Sessions')
  })

  it('uses authClient.listSessions', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('authClient.listSessions()')
  })

  it('uses authClient.revokeSession', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('authClient.revokeSession')
  })

  it('uses authClient.revokeOtherSessions', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('authClient.revokeOtherSessions()')
  })

  it('identifies current session', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('currentSessionId')
    expect(settingsSource).toContain('This device')
  })

  it('has sign out all others button', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('Sign out all others')
  })

  it('has sign out per session button', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('Sign out')
  })

  it('has user agent parser', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('parseUserAgent')
    expect(settingsSource).toContain('browser')
    expect(settingsSource).toContain('os')
  })
})
