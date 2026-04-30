import { expect, test } from '@playwright/test'
import { fetchClientEvidence, fetchServerEvidence, detectStrategy, formatGroupSummary } from './helpers'

const TEST_EMAIL = 'admin@vibekit.local'
const TEST_PASSWORD = 'admin12345678'

const AUTH_ROUTES = [
  { path: '/app/dashboard', group: '(app)', label: 'App Dashboard' },
  { path: '/app/items', group: '(app)', label: 'App Items' },
  { path: '/app/profile', group: '(app)', label: 'App Profile' },
  { path: '/app/settings', group: '(app)', label: 'App Settings' },
  { path: '/admin/dashboard', group: '(admin)', label: 'Admin Dashboard' },
  { path: '/admin/users', group: '(admin)', label: 'Admin Users' },
  { path: '/admin/blog', group: '(admin)', label: 'Admin Blog' },
  { path: '/admin/audit', group: '(admin)', label: 'Admin Audit' },
]

interface AuthResult {
  path: string
  group: string
  label: string
  server: Awaited<ReturnType<typeof fetchServerEvidence>>
  client: Awaited<ReturnType<typeof fetchClientEvidence>> | null
  detected: string
  pass: boolean
  notes: string[]
}

test.describe('Authenticated CSR Rendering Proof', () => {
  test('login then prove SPA routes render client-side', async ({ page }) => {
    // 1. Log in via the login page
    await page.goto('/login', { waitUntil: 'networkidle' })

    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL)
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect to /app/dashboard
    await page.waitForURL('**/app/**', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Confirm we're authenticated
    const currentUrl = page.url()
    if (!currentUrl.includes('/app')) {
      throw new Error(`Login failed — redirected to ${currentUrl} instead of /app`)
    }

    // 2. Test each SPA route
    const results: AuthResult[] = []

    for (const route of AUTH_ROUTES) {
      const notes: string[] = []

      // Capture raw server HTML (no client JS execution)
      const server = await fetchServerEvidence(page, route.path)

      // Capture client-rendered content
      let client: Awaited<ReturnType<typeof fetchClientEvidence>> | null = null
      if (server.status >= 200 && server.status < 300) {
        try {
          client = await fetchClientEvidence(page, route.path, server.bodyTextLength)
        } catch {
          notes.push('Client navigation failed')
        }
      }

      // Detect strategy
      const isShell = server.bodyTextLength < 200
      const hasSvelteKit = server.hasSvelteKitRuntime
      const clientPopulated = client && client.bodyTextLength > 100
      const clientHydrated = client?.hydrated ?? false

      let detected = 'unknown'
      if (isShell && clientPopulated && clientHydrated) {
        detected = 'csr-only'
        notes.push(`SERVER sent EMPTY SHELL (${server.bodyTextLength} chars) — page is NOT rendered on server`)
        notes.push(`CLIENT rendered everything (${client.bodyTextLength} chars) — this is a CSR/SPA route (ssr=false)`)
      } else if (isShell && clientPopulated && !clientHydrated) {
        detected = 'csr-only'
        notes.push(`SERVER sent EMPTY SHELL (${server.bodyTextLength} chars)`)
        notes.push(`CLIENT populated content (${client.bodyTextLength} chars) but hydration markers not detected`)
      } else if (isShell) {
        detected = 'csr-shell-only'
        notes.push(`SERVER sent EMPTY SHELL (${server.bodyTextLength} chars) — client rendering may need more time`)
      } else if (server.bodyTextLength > 200) {
        detected = 'ssr-with-csr'
        notes.push(`SERVER sent POPULATED HTML (${server.bodyTextLength} chars) — unexpected for CSR route`)
      }

      const pass = detected === 'csr-only'
      results.push({
        path: route.path,
        group: route.group,
        label: route.label,
        server,
        client,
        detected,
        pass,
        notes,
      })
    }

    // 3. Print expressive report
    console.log('\n')
    console.log('='.repeat(70))
    console.log('  AUTHENTICATED CSR RENDERING PROOF')
    console.log('='.repeat(70))
    console.log(`  Logged in as: ${TEST_EMAIL}`)
    console.log('')
    console.log('  Proving: ssr=false routes send EMPTY SHELL from server,')
    console.log('           then client JavaScript renders all content.')
    console.log('')

    let totalPass = 0
    let totalFail = 0

    for (const r of results) {
      const icon = r.pass ? 'PASS' : 'FAIL'
      console.log(`  [${icon}] ${r.path} (${r.label})`)
      console.log(`    SERVER: ${r.server.htmlSize.toLocaleString()} bytes | body: ${r.server.bodyTextLength} chars | SvelteKit: ${r.server.hasSvelteKitRuntime ? 'YES' : 'NO'}`)
      if (r.client) {
        console.log(`    CLIENT: hydrated=${r.client.hydrated} | body: ${r.client.bodyTextLength} chars | delta: +${r.client.bodyTextDelta}`)
      }
      console.log(`    STRATEGY: ${r.detected}`)
      for (const n of r.notes) console.log(`    EVIDENCE: ${n}`)
      console.log('')
      if (r.pass) totalPass++
      else totalFail++
    }

    console.log('='.repeat(70))
    console.log(`  RESULT: ${totalPass}/${results.length} routes proved CSR-only`)
    console.log('='.repeat(70))
    console.log('')

    // 4. Assert all CSR routes pass
    const failed = results.filter((r) => !r.pass)
    expect(
      failed.length,
      `${failed.length} CSR route(s) failed: ${failed.map((f) => f.path).join(', ')}`,
    ).toBe(0)
  })
})
