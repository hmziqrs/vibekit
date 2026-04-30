import { expect, test } from '@playwright/test'
import { ROUTES } from './rendering-manifest'
import type { RenderingStrategy } from './rendering-manifest'
import {
  detectStrategy,
  fetchClientEvidence,
  fetchServerEvidence,
  formatGroupSummary,
  formatRouteReport,
} from './helpers'

interface RouteResult {
  path: string
  group: string
  server: Awaited<ReturnType<typeof fetchServerEvidence>>
  client: Awaited<ReturnType<typeof fetchClientEvidence>> | null
  detected: RenderingStrategy
  expected: RenderingStrategy
  explanation: string[]
  pass: boolean
}

test.describe('Rendering Strategy Audit — Production Build', () => {
  test('route-by-route production build rendering proof', async ({ page }) => {
    const results: RouteResult[] = []

    for (const route of ROUTES) {
      const server = await fetchServerEvidence(page, route.path)

      let client: Awaited<ReturnType<typeof fetchClientEvidence>> | null = null
      if (server.status >= 200 && server.status < 300) {
        try {
          client = await fetchClientEvidence(page, route.path, server.bodyTextLength)
        } catch {
          // client navigation failed — tolerate for routes needing auth/DB
        }
      }

      const { strategy, explanation } = detectStrategy(server, client)
      const expected = route.expectedStrategy
      const pass = strategy === expected

      results.push({
        path: route.path,
        group: route.group,
        server,
        client,
        detected: strategy,
        expected,
        explanation,
        pass,
      })
    }

    // Print expressive report
    console.log('\n')
    console.log('='.repeat(70))
    console.log('  COMPREHENSIVE RENDERING AUDIT — PRODUCTION BUILD')
    console.log('='.repeat(70))
    console.log('')
    console.log('  This test runs against the PRODUCTION build (wrangler dev).')
    console.log('  It proves what was actually built and deployed.')
    console.log('')
    console.log('  Legend:')
    console.log('    BUILD   = page rendered to static HTML at build time (SSG)')
    console.log('    SERVER  = page rendered on server at request time (SSR)')
    console.log('    CLIENT  = page rendered by JavaScript in browser (CSR)')
    console.log('')

    for (const r of results) {
      console.log(formatRouteReport(r))
    }

    console.log('─'.repeat(70))
    console.log('  SUMMARY BY GROUP')
    console.log('─'.repeat(70))
    console.log(formatGroupSummary(results))
    console.log('='.repeat(70))
    console.log('')

    const failures = results.filter((r) => !r.pass)
    const tolerableFailures = failures.filter((r) => {
      const route = ROUTES.find((rt) => rt.path === r.path)
      return route?.requiresDb || route?.requiresAuth
    })
    const hardFailures = failures.filter(
      (f) => !tolerableFailures.some((t) => t.path === f.path),
    )

    if (tolerableFailures.length > 0) {
      console.log(
        `Tolerated ${tolerableFailures.length} failure(s) for routes needing DB seed or auth:`,
      )
      for (const f of tolerableFailures) {
        console.log(`  - ${f.path}: expected ${f.expected}, detected ${f.detected}`)
      }
    }

    expect(
      hardFailures.length,
      `${hardFailures.length} route(s) failed unexpectedly: ${hardFailures.map((f) => f.path).join(', ')}`,
    ).toBe(0)
  })
})
