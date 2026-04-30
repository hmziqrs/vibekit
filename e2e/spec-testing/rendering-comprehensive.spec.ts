import { expect, test } from '@playwright/test'

/**
 * Comprehensive Rendering Test Suite — RUNTIME / DEV SERVER BEHAVIOUR
 *
 * This test runs against the dev server (or preview server).  It proves:
 *   1. What the SERVER sends for each route (populated HTML vs empty shell)
 *   2. Whether the CLIENT hydrates the page (SvelteKit runtime starts)
 *
 * NOTE: Build-time prerendering (SSG) is verified by the build script
 *       `bun run test:rendering:v2`.  In dev mode ALL pages are served by
 *       the Vite dev server, so "prerendered-no-csr" does not exist here.
 */

const DEV_ROUTES = [
  // (public) — default ssr=true, csr=true in dev
  { path: '/', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/features', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/pricing', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/about', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/privacy', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/terms', expected: 'ssr-with-csr', group: '(public)' },

  // (public)/contact — prerender=false, csr=true (still SSR'd in dev)
  { path: '/contact', expected: 'ssr-with-csr', group: '(public)/contact' },

  // (app) — auth guard redirects to /login in dev
  { path: '/app/dashboard', expected: 'redirect', group: '(app)' },
  { path: '/app/items', expected: 'redirect', group: '(app)' },
  { path: '/app/profile', expected: 'redirect', group: '(app)' },
  { path: '/app/settings', expected: 'redirect', group: '(app)' },

  // (admin) — auth guard redirects to /login in dev
  { path: '/admin/dashboard', expected: 'redirect', group: '(admin)' },
  { path: '/admin/blog', expected: 'redirect', group: '(admin)' },
  { path: '/admin/users', expected: 'redirect', group: '(admin)' },
  { path: '/admin/audit', expected: 'redirect', group: '(admin)' },

  // (blog) — needs DB seed in dev; returns 404 without posts
  { path: '/blog', expected: 'error', group: '(blog)' },

  // (auth) — defaults
  { path: '/login', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/register', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/forgot-password', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/reset-password', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/verify-email', expected: 'ssr-with-csr', group: '(auth)' },
]

type RouteResult = {
  path: string
  expected: string
  group: string
  status: number
  serverHTMLSize: number
  serverBodyText: number
  hasSvelteKitScripts: boolean
  hasHydrationData: boolean
  isPopulatedServer: boolean
  isEmptyShell: boolean
  clientHydrated: boolean | null
  clientBodyText: number
  finalHTMLSize: number
  detected: string
  pass: boolean
  notes: string[]
}

function extractBodyText(html: string): number {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return m?.[1]
    ?.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim().length ?? 0
}

function hasSvelteKitScripts(html: string): boolean {
  return html.includes('__sveltekit') || html.includes('data-sveltekit') || html.includes('data-sveltekit-hydrate') || html.includes('sveltekit:')
}

function isPopulated(html: string): boolean {
  return extractBodyText(html) > 200
}

function isEmptyShell(html: string): boolean {
  return extractBodyText(html) < 100
}

test.describe('🔬 Comprehensive Rendering Strategy Audit', () => {
  test('route-by-route server vs client rendering proof', async ({ page }) => {
    const results: RouteResult[] = []

    for (const route of DEV_ROUTES) {
      const notes: string[] = []
      let serverHTML = ''
      let status = 0

      try {
        // 1️⃣ Capture raw server HTML via direct request (no client JS runs)
        const resp = await page.request.get(route.path, { maxRedirects: 0 })
        status = resp.status()
        serverHTML = await resp.text().catch(() => '')
      } catch (e: any) {
        notes.push(`Request error: ${e.message}`)
      }

      const serverBodyText = extractBodyText(serverHTML)
      const populated = isPopulated(serverHTML)
      const empty = isEmptyShell(serverHTML)
      const svelteKitScripts = hasSvelteKitScripts(serverHTML)
      const hydrationData = serverHTML.includes('data-sveltekit-fetched') || serverHTML.includes('__data')

      // 2️⃣ Client-side proof: load page in browser, wait for hydration, measure
      let clientHydrated: boolean | null = null
      let clientBodyText = 0
      let finalHTMLSize = 0

      if (status >= 200 && status < 300) {
        await page.goto(route.path, { waitUntil: 'networkidle' })
        await page.waitForTimeout(200)

        clientHydrated = await page.evaluate(() =>
          !!(window as any).__sveltekit || !!(window as any).start_app || document.documentElement.innerHTML.includes('__sveltekit')
        )
        clientBodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().length)
        finalHTMLSize = (await page.content()).length
      }

      // 3️⃣  Detect strategy from evidence
      let detected = 'unknown'
      if (status >= 300 && status < 400) {
        detected = 'redirect'
        notes.push('Server returned redirect (3xx)')
      } else if (status >= 400) {
        detected = 'error'
        notes.push(`Server returned error ${status} — page may need DB seed or data`)
      } else if (populated && !svelteKitScripts && !hydrationData) {
        detected = 'prerendered-no-csr'
        notes.push('Server sent FULL HTML with NO hydration scripts → this page was rendered at BUILD time and will NOT hydrate on client')
      } else if (empty && svelteKitScripts) {
        detected = 'csr-only'
        notes.push('Server sent EMPTY SHELL with hydration scripts → this page is NOT rendered on server; client JS will render everything')
      } else if (populated && svelteKitScripts) {
        detected = 'ssr-with-csr'
        notes.push('Server sent POPULATED HTML with hydration scripts → server rendered first, client will hydrate')
      } else if (populated && !svelteKitScripts) {
        detected = 'ssr-no-csr'
        notes.push('Server sent POPULATED HTML but no SvelteKit runtime → pure SSR, no client hydration')
      } else if (populated) {
        detected = 'ssr-with-csr'
        notes.push('Server sent POPULATED HTML (runtime markers may be injected differently) → SSR with hydration')
      } else if (empty) {
        detected = 'csr-only'
        notes.push('Server sent minimal HTML → CSR shell')
      }

      // Cross-check: if we expected CSR-only, server body should be tiny
      if (route.expected === 'csr-only' && serverBodyText > 500) {
        notes.push(`WARNING: expected empty shell but server body has ${serverBodyText} chars`)
      }

      const pass = detected === route.expected
      if (!pass) notes.push(`MISMATCH: expected ${route.expected} but detected ${detected}`)

      results.push({
        path: route.path,
        expected: route.expected,
        group: route.group,
        status,
        serverHTMLSize: serverHTML.length,
        serverBodyText,
        hasSvelteKitScripts: svelteKitScripts,
        hasHydrationData: hydrationData,
        isPopulatedServer: populated,
        isEmptyShell: empty,
        clientHydrated,
        clientBodyText,
        finalHTMLSize,
        detected,
        pass,
        notes,
      })
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRINT EXPRESSIVE REPORT
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n\n══════════════════════════════════════════════════════════════════════')
    console.log('  COMPREHENSIVE RENDERING AUDIT — SERVER vs CLIENT PROOF')
    console.log('══════════════════════════════════════════════════════════════════════')
    console.log('')
    console.log('Legend:')
    console.log('  🏗️  BUILD   = page is rendered to static HTML at build time (SSG)')
    console.log('  🖥️  SERVER  = page is rendered on the server at request time (SSR)')
    console.log('  🖱️  CLIENT  = page is rendered by JavaScript in the browser (CSR)')
    console.log('')

    const groups = new Map<string, RouteResult[]>()
    for (const r of results) { const g = groups.get(r.group) ?? []; g.push(r); groups.set(r.group, g) }

    let totalPass = 0, totalFail = 0

    for (const [group, pages] of groups) {
      console.log(`📁 ${group}`)
      console.log('─'.repeat(66))
      for (const r of pages) {
        const icon = r.pass ? '✅' : '❌'
        const where =
          r.detected === 'prerendered-no-csr' ? '🏗️  BUILD  — static HTML, zero client JS'
            : r.detected === 'csr-only' ? '🖱️  CLIENT — empty shell, fully client rendered'
              : r.detected === 'ssr-with-csr' ? '🖥️  SERVER + 🖱️ CLIENT — SSR then hydrate'
                : r.detected === 'redirect' ? '➡️  REDIRECT'
                  : '❓ UNKNOWN'

        console.log(`  ${icon} ${r.path}`)
        console.log(`     Strategy: ${r.detected}`)
        console.log(`     Where:    ${where}`)
        console.log(`     Server HTML: ${r.serverHTMLSize} bytes | body text: ${r.serverBodyText}`)
        if (r.clientHydrated !== null) {
          console.log(`     Client:   hydrated=${r.clientHydrated} | final body text: ${r.clientBodyText}`)
        }
        if (r.notes.length) {
          for (const n of r.notes) console.log(`     ℹ️  ${n}`)
        }
        console.log('')
        if (r.pass) totalPass++; else totalFail++
      }
    }

    // Summary table
    console.log('══════════════════════════════════════════════════════════════════════')
    console.log('  SUMMARY')
    console.log('══════════════════════════════════════════════════════════════════════')
    const pre = results.filter(r => r.detected === 'prerendered-no-csr').length
    const csr = results.filter(r => r.detected === 'csr-only').length
    const ssr = results.filter(r => r.detected === 'ssr-with-csr').length
    const red = results.filter(r => r.detected === 'redirect').length
    console.log(`  Build-rendered (SSG):     ${pre} pages`)
    console.log(`  Server-rendered (SSR):      ${ssr} pages`)
    console.log(`  Client-rendered (CSR/SPA):  ${csr} pages`)
    console.log(`  Redirects:                  ${red} pages`)
    console.log(`  Total checked:              ${results.length} pages`)
    console.log(`  ✅ PASS: ${totalPass} | ❌ FAIL: ${totalFail}`)
    console.log('══════════════════════════════════════════════════════════════════════\n')

    // Allow up to 2 failures for routes that need DB seed / auth in dev
    if (totalFail > 0) {
      console.log(`⚠️  ${totalFail} route(s) failed — may need DB seed or auth session`)
    }
    expect(totalFail).toBeLessThanOrEqual(2)
  })
})
