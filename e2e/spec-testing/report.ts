import { STRATEGY_LABEL } from './constants'
import type { ClientEvidence, RenderingStrategy, RouteResult, ServerEvidence } from './types'

export function formatRouteReport(result: {
  path: string
  server: ServerEvidence
  client: ClientEvidence | null
  detected: RenderingStrategy
  expected: RenderingStrategy
  explanation: string[]
  pass: boolean
}): string {
  const lines: string[] = []
  const icon = result.pass ? 'PASS' : 'FAIL'

  lines.push(`[${icon}] ${result.path}`)
  lines.push(
    `  SERVER: ${result.server.htmlSize.toLocaleString()} bytes HTML | ${result.server.bodyTextLength} chars body | SvelteKit: ${result.server.hasSvelteKitRuntime ? 'YES' : 'NO'} | Scripts: ${result.server.hasScripts ? 'YES' : 'NO'}`
  )
  if (result.client) {
    lines.push(
      `  CLIENT: hydrated=${result.client.hydrated} | final body: ${result.client.bodyTextLength} chars | delta: ${result.client.bodyTextDelta >= 0 ? '+' : ''}${result.client.bodyTextDelta}`
    )
  }
  lines.push(`  DETECTED: ${result.detected}`)
  lines.push(`  EXPECTED: ${result.expected}`)
  for (const note of result.explanation) {
    lines.push(`  EVIDENCE: ${note}`)
  }
  lines.push('')

  return lines.join('\n')
}

export function formatGroupSummary(
  results: { path: string; group: string; detected: RenderingStrategy; pass: boolean }[]
): string {
  const groups = new Map<string, typeof results>()
  for (const r of results) {
    const list = groups.get(r.group) ?? []
    list.push(r)
    groups.set(r.group, list)
  }

  const lines: string[] = []
  let totalPass = 0
  let totalFail = 0

  for (const [group, pages] of groups) {
    const passed = pages.filter((p) => p.pass).length
    const failed = pages.length - passed
    totalPass += passed
    totalFail += failed
    lines.push(
      `${group}: ${passed}/${pages.length} passed${failed > 0 ? ` (${failed} FAILED)` : ''}`
    )
  }

  const strategies = new Map<RenderingStrategy, number>()
  for (const r of results) {
    strategies.set(r.detected, (strategies.get(r.detected) ?? 0) + 1)
  }

  lines.push('')
  lines.push('Strategy Distribution:')
  for (const [strategy, count] of strategies) {
    lines.push(`  ${STRATEGY_LABEL[strategy]}: ${count} pages`)
  }
  lines.push('')
  lines.push(`TOTAL: ${totalPass} passed | ${totalFail} failed`)

  return lines.join('\n')
}

export function printAuditHeader(title: string, subtitle?: string): void {
  console.log('\n')
  console.log('='.repeat(70))
  console.log(`  ${title}`)
  console.log('='.repeat(70))
  if (subtitle) {
    console.log('')
    console.log(`  ${subtitle}`)
  }
  console.log('')
  console.log('  Legend:')
  console.log('    BUILD   = page rendered to static HTML at build time (SSG)')
  console.log('    SERVER  = page rendered on server at request time (SSR)')
  console.log('    CLIENT  = page rendered by JavaScript in browser (CSR)')
  console.log('')
}
