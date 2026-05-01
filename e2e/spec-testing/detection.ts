import type { ClientEvidence, ServerEvidence, StrategyDetection } from './types'

export function detectStrategy(
  server: ServerEvidence,
  client: ClientEvidence | null
): StrategyDetection {
  const notes: string[] = []

  if (server.status >= 300 && server.status < 400) {
    const location = server.headers['location'] ?? 'unknown'
    notes.push(`Server returned ${server.status} redirect → ${location}`)
    return { explanation: notes, strategy: 'redirect' }
  }

  if (server.status >= 400) {
    notes.push(`Server returned error ${server.status}`)
    return { explanation: notes, strategy: 'error' }
  }

  if (server.isPopulated && !server.hasScripts && !server.hasHydrationData) {
    notes.push(
      `Server sent FULL HTML (${server.bodyTextLength} chars body) with NO scripts or hydration data — rendered at BUILD time`
    )
    notes.push('No hydration scripts, no client JS needed — pure static HTML')
    return { explanation: notes, strategy: 'prerendered-no-csr' }
  }

  if (server.isPopulated && server.bodyTextLength > 500) {
    notes.push(
      `Server sent POPULATED HTML (${server.bodyTextLength} chars body) with SvelteKit runtime`
    )
    if (client?.hydrated) {
      notes.push(
        `Client hydrated successfully — final body: ${client.bodyTextLength} chars (delta: ${client.bodyTextDelta >= 0 ? '+' : ''}${client.bodyTextDelta})`
      )
    } else {
      notes.push('This page was prerendered at build time WITH client hydration scripts')
    }
    if (!client || client.hydrated) {
      return {
        explanation: notes,
        strategy: server.hasScripts ? 'ssr-with-csr' : 'prerendered-no-csr',
      }
    }
    return { explanation: notes, strategy: 'ssr-with-csr' }
  }

  if (server.isEmptyShell && client && client.bodyTextLength > 200) {
    notes.push(
      `Server sent EMPTY SHELL (${server.bodyTextLength} chars body) — NOT rendered on server`
    )
    notes.push(
      `Client rendered everything — final body: ${client.bodyTextLength} chars (delta: +${client.bodyTextDelta})`
    )
    notes.push('This is a CSR-only SPA route (ssr=false, csr=true)')
    return { explanation: notes, strategy: 'csr-only' }
  }

  if (server.hasScripts && server.hasSvelteKitRuntime) {
    notes.push(
      `Server sent HTML (${server.bodyTextLength} chars body) with SvelteKit runtime and scripts`
    )
    if (client?.hydrated) {
      notes.push(
        `Client hydrated successfully — final body: ${client.bodyTextLength} chars (delta: ${client.bodyTextDelta >= 0 ? '+' : ''}${client.bodyTextDelta})`
      )
    }
    notes.push('Server-side rendered with client hydration')
    return { explanation: notes, strategy: 'ssr-with-csr' }
  }

  if (server.isPopulated && server.hasScripts) {
    notes.push(`Server sent POPULATED HTML (${server.bodyTextLength} chars body) with scripts`)
    notes.push('Prerendered at build time with client hydration enabled')
    return { explanation: notes, strategy: 'prerendered-with-csr' }
  }

  notes.push(
    `Could not determine strategy — server body: ${server.bodyTextLength}, scripts: ${server.hasScripts}, SvelteKit: ${server.hasSvelteKitRuntime}`
  )
  return { explanation: notes, strategy: 'unknown' }
}
