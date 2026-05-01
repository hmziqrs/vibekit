import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { expect } from 'vitest'

import { detectStrategy } from './detection'
import { fetchClientEvidence, fetchServerEvidence } from './evidence'
import { ROUTES } from './manifest'
import { formatGroupSummary, formatRouteReport, printAuditHeader } from './report'
import type { RouteConfig, RouteResult } from './types'

export interface AuditOptions {
  title: string
  subtitle?: string
  strategyKey: 'devStrategy' | 'expectedStrategy' | 'authenticatedStrategy'
  routes?: RouteConfig[]
  tolerantMode?: boolean
  setup?: (page: Page) => Promise<void>
}

export async function runRenderingAudit(page: Page, options: AuditOptions): Promise<RouteResult[]> {
  const routes = options.routes ?? ROUTES

  if (options.setup) {
    await options.setup(page)
  }

  const results: RouteResult[] = []

  for (const route of routes) {
    const expected = route[options.strategyKey]
    if (!expected) {
      continue
    }

    const server = await fetchServerEvidence(page, route.path)

    let client = null
    if (server.status >= 200 && server.status < 300) {
      try {
        client = await fetchClientEvidence(page, route.path, server.bodyTextLength)
      } catch {
        // Client navigation failed — tolerate for routes needing auth/DB
      }
    }

    const { strategy, explanation } = detectStrategy(server, client)
    const pass = strategy === expected

    results.push({
      client,
      detected: strategy,
      expected,
      explanation,
      group: route.group,
      pass,
      path: route.path,
      server,
    })
  }

  printAuditHeader(options.title, options.subtitle)

  for (const r of results) {
    console.log(formatRouteReport(r))
  }

  console.log('─'.repeat(70))
  console.log('  SUMMARY BY GROUP')
  console.log('─'.repeat(70))
  console.log(formatGroupSummary(results))
  console.log('='.repeat(70))
  console.log('')

  if (options.tolerantMode) {
    const failures = results.filter((r) => !r.pass)
    const tolerable = failures.filter((r) => {
      const route = routes.find((rt) => rt.path === r.path)
      return route?.requiresDb || route?.requiresAuth
    })
    const hard = failures.filter((f) => !tolerable.some((t) => t.path === f.path))

    if (tolerable.length > 0) {
      console.log(`Tolerated ${tolerable.length} failure(s) for routes needing DB seed or auth:`)
      for (const f of tolerable) {
        console.log(`  - ${f.path}: expected ${f.expected}, detected ${f.detected}`)
      }
    }

    expect(
      hard.length,
      `${hard.length} route(s) failed unexpectedly: ${hard.map((f) => f.path).join(', ')}`
    ).toBe(0)
  } else {
    const failures = results.filter((r) => !r.pass)
    expect(
      failures.length,
      `${failures.length} route(s) failed: ${failures.map((f) => f.path).join(', ')}`
    ).toBe(0)
  }

  return results
}
