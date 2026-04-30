import type { Page } from '@playwright/test'
import type { RenderingStrategy } from './rendering-manifest'

export interface ServerEvidence {
  status: number
  html: string
  headers: Record<string, string>
  htmlSize: number
  bodyTextLength: number
  hasSvelteKitRuntime: boolean
  hasHydrationData: boolean
  hasScripts: boolean
  isPopulated: boolean
  isEmptyShell: boolean
}

export interface ClientEvidence {
  hydrated: boolean
  bodyTextLength: number
  finalHTMLSize: number
  bodyTextDelta: number
}

export interface StrategyDetection {
  strategy: RenderingStrategy
  explanation: string[]
}

export async function fetchServerEvidence(page: Page, url: string): Promise<ServerEvidence> {
  const resp = await page.request.get(url, { maxRedirects: 0 })
  const status = resp.status()
  const html = await resp.text().catch(() => '')
  const headers: Record<string, string> = resp.headers()

  const bodyTextLength = extractBodyTextLength(html)
  const hasSvelteKitRuntime =
    html.includes('__sveltekit') ||
    html.includes('data-sveltekit') ||
    html.includes('sveltekit:')
  const hasHydrationData =
    html.includes('data-sveltekit-fetched') || html.includes('__data')
  const hasScripts =
    html.includes('<script') &&
    (html.includes('.js') || html.includes('type="module"') || html.includes('__sveltekit'))

  return {
    status,
    html,
    headers,
    htmlSize: html.length,
    bodyTextLength,
    hasSvelteKitRuntime,
    hasHydrationData,
    hasScripts,
    isPopulated: bodyTextLength > 200,
    isEmptyShell: bodyTextLength < 100,
  }
}

export async function fetchClientEvidence(
  page: Page,
  url: string,
  serverBodyText: number,
): Promise<ClientEvidence> {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(200)

  const hydrated = await page.evaluate(
    () =>
      !!(window as any).__sveltekit ||
      !!(window as any).start_app ||
      document.documentElement.innerHTML.includes('__sveltekit'),
  )
  const bodyTextLength = await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, ' ').trim().length,
  )
  const finalHTMLSize = (await page.content()).length

  return {
    hydrated,
    bodyTextLength,
    finalHTMLSize,
    bodyTextDelta: bodyTextLength - serverBodyText,
  }
}

export function detectStrategy(
  server: ServerEvidence,
  client: ClientEvidence | null,
): StrategyDetection {
  const notes: string[] = []

  if (server.status >= 300 && server.status < 400) {
    const location = server.headers['location'] ?? 'unknown'
    notes.push(`Server returned ${server.status} redirect → ${location}`)
    return { strategy: 'redirect', explanation: notes }
  }

  if (server.status >= 400) {
    notes.push(`Server returned error ${server.status}`)
    return { strategy: 'error', explanation: notes }
  }

  if (server.isPopulated && !server.hasSvelteKitRuntime && !server.hasHydrationData) {
    notes.push(
      `Server sent FULL HTML (${server.bodyTextLength} chars body) with NO SvelteKit runtime — rendered at BUILD time`,
    )
    notes.push('No hydration scripts, no client JS needed — pure static HTML')
    return { strategy: 'prerendered-no-csr', explanation: notes }
  }

  if (server.isPopulated && server.hasSvelteKitRuntime && server.bodyTextLength > 500) {
    if (client?.hydrated) {
      notes.push(
        `Server sent POPULATED HTML (${server.bodyTextLength} chars body) with SvelteKit runtime`,
      )
      notes.push(
        `Client hydrated successfully — final body: ${client.bodyTextLength} chars (delta: ${client.bodyTextDelta >= 0 ? '+' : ''}${client.bodyTextDelta})`,
      )
    } else {
      notes.push(
        `Server sent POPULATED HTML (${server.bodyTextLength} chars body) with SvelteKit runtime`,
      )
      notes.push('This page was prerendered at build time WITH client hydration scripts')
    }
    if (!client || client.hydrated) {
      return { strategy: server.hasScripts ? 'ssr-with-csr' : 'prerendered-no-csr', explanation: notes }
    }
    return { strategy: 'ssr-with-csr', explanation: notes }
  }

  if (server.isEmptyShell && client && client.bodyTextLength > 200) {
    notes.push(
      `Server sent EMPTY SHELL (${server.bodyTextLength} chars body) — NOT rendered on server`,
    )
    notes.push(
      `Client rendered everything — final body: ${client.bodyTextLength} chars (delta: +${client.bodyTextDelta})`,
    )
    notes.push('This is a CSR-only SPA route (ssr=false, csr=true)')
    return { strategy: 'csr-only', explanation: notes }
  }

  if (server.hasScripts && server.hasSvelteKitRuntime) {
    notes.push(
      `Server sent HTML (${server.bodyTextLength} chars body) with SvelteKit runtime and scripts`,
    )
    if (client?.hydrated) {
      notes.push(
        `Client hydrated successfully — final body: ${client.bodyTextLength} chars (delta: ${client.bodyTextDelta >= 0 ? '+' : ''}${client.bodyTextDelta})`,
      )
    }
    notes.push('Server-side rendered with client hydration')
    return { strategy: 'ssr-with-csr', explanation: notes }
  }

  if (server.isPopulated && server.hasScripts) {
    notes.push(
      `Server sent POPULATED HTML (${server.bodyTextLength} chars body) with scripts`,
    )
    notes.push('Prerendered at build time with client hydration enabled')
    return { strategy: 'prerendered-with-csr', explanation: notes }
  }

  notes.push(`Could not determine strategy — server body: ${server.bodyTextLength}, scripts: ${server.hasScripts}, SvelteKit: ${server.hasSvelteKitRuntime}`)
  return { strategy: 'unknown', explanation: notes }
}

function extractBodyTextLength(html: string): number {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return (
    match?.[1]
      ?.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim().length ?? 0
  )
}

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
    `  SERVER: ${result.server.htmlSize.toLocaleString()} bytes HTML | ${result.server.bodyTextLength} chars body | SvelteKit: ${result.server.hasSvelteKitRuntime ? 'YES' : 'NO'} | Scripts: ${result.server.hasScripts ? 'YES' : 'NO'}`,
  )
  if (result.client) {
    lines.push(
      `  CLIENT: hydrated=${result.client.hydrated} | final body: ${result.client.bodyTextLength} chars | delta: ${result.client.bodyTextDelta >= 0 ? '+' : ''}${result.client.bodyTextDelta}`,
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
  results: Array<{ path: string; group: string; detected: RenderingStrategy; pass: boolean }>,
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
    lines.push(`${group}: ${passed}/${pages.length} passed${failed > 0 ? ` (${failed} FAILED)` : ''}`)
  }

  const strategies = new Map<RenderingStrategy, number>()
  for (const r of results) strategies.set(r.detected, (strategies.get(r.detected) ?? 0) + 1)

  lines.push('')
  lines.push('Strategy Distribution:')
  const labels: Record<string, string> = {
    'prerendered-no-csr': 'Pre-rendered (static, no JS)',
    'prerendered-with-csr': 'Pre-rendered (static + hydration)',
    'ssr-with-csr': 'SSR + Client Hydration',
    'csr-only': 'CSR / SPA Only',
    redirect: 'Redirects',
    error: 'Errors',
    unknown: 'Unknown',
  }
  for (const [strategy, count] of strategies) {
    lines.push(`  ${labels[strategy] ?? strategy}: ${count} pages`)
  }
  lines.push('')
  lines.push(`TOTAL: ${totalPass} passed | ${totalFail} failed`)

  return lines.join('\n')
}
