import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/lib/server/auth-hono.ts'), 'utf8')

describe('auth-hono', () => {
  it('exports createAuthForHono function', () => {
    expect(source).toContain('export const createAuthForHono = (db: AppDb)')
  })

  it('reuses authConfig from auth module', () => {
    expect(source).toContain("import { authConfig } from './auth'")
    expect(source).toContain('...authConfig')
  })

  it('uses drizzle adapter with sqlite provider', () => {
    expect(source).toContain("drizzleAdapter(db, { provider: 'sqlite' })")
  })

  it('intentionally omits plugins (no sveltekitCookies)', () => {
    expect(source).toContain('plugins: []')
    expect(source).toContain('Intentionally no sveltekitCookies')
  })

  it('does not import sveltekitCookies as a dependency', () => {
    expect(source).not.toContain("from 'better-auth/svelte-kit'")
    expect(source).not.toContain('import { sveltekitCookies')
  })

  it('does not import passkey or twoFactor', () => {
    expect(source).not.toContain('passkey')
    expect(source).not.toContain('twoFactor')
  })

  it('imports AppDb type from services', () => {
    expect(source).toContain("import type { AppDb } from './services/types'")
  })
})
