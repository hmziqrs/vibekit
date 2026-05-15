/**
 * Postbuild script: injects a `scheduled` handler into the generated worker.ts
 * so that Cloudflare Workers cron triggers actually dispatch to our API endpoints.
 *
 * Usage: bun run postbuild (automatically run after `bun run build`)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const workerPath = resolve(import.meta.dirname, '..', 'worker.ts')

const scheduledHandler = `
  // Cron scheduled handler — dispatches to API endpoints with x-cron-secret
  async scheduled(event, env2, ctx) {
    const origin = env2.ORIGIN || 'http://localhost:8787'
    const headers = { 'x-cron-secret': env2.CRON_SECRET || '' }

    if (event.cron === '*/5 * * * *') {
      ctx.waitUntil(
        Promise.all([
          fetch(origin + '/api/admin/publish-scheduled', { method: 'POST', headers })
            .then((r) => r.json())
            .then((d) => console.log('[cron:5min] publish:', JSON.stringify(d)))
            .catch((e) => console.error('[cron:5min] publish:', e.message)),
          fetch(origin + '/api/admin/retry-webhooks', { method: 'POST', headers })
            .then((r) => r.json())
            .then((d) => console.log('[cron:5min] webhooks:', JSON.stringify(d)))
            .catch((e) => console.error('[cron:5min] webhooks:', e.message)),
        ])
      )
    }

    if (event.cron === '0 3 * * *') {
      ctx.waitUntil(
        fetch(origin + '/api/admin/cleanup', { method: 'POST', headers })
          .then((r) => r.json())
          .then((d) => console.log('[cron:daily] cleanup:', JSON.stringify(d)))
          .catch((e) => console.error('[cron:daily] cleanup:', e.message))
      )
    }
  },`

let content: string
try {
  content = readFileSync(workerPath, 'utf-8')
} catch {
  console.error('worker.ts not found — run `bun run build` first')
  process.exit(1)
}

if (content.includes('async scheduled(')) {
  console.log('worker.ts already has a scheduled handler — skipping injection')
  process.exit(0)
}

// Insert the scheduled handler right before the closing of worker_default
const marker = 'async fetch(req, env2, ctx) {'
const idx = content.indexOf(marker)
if (idx === -1) {
  console.error('Could not find fetch handler in worker.ts — aborting')
  process.exit(1)
}

// Find the end of the fetch method (matching closing brace)
let braceCount = 0
let fetchEnd = -1
let inFetch = false
for (let i = idx; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++
    inFetch = true
  } else if (content[i] === '}') {
    braceCount--
    if (inFetch && braceCount === 0) {
      fetchEnd = i
      break
    }
  }
}

if (fetchEnd === -1) {
  console.error('Could not find end of fetch handler — aborting')
  process.exit(1)
}

// Insert scheduled handler after fetch method's closing brace
const result = content.slice(0, fetchEnd + 1) + ',' + scheduledHandler + content.slice(fetchEnd + 1)

writeFileSync(workerPath, result, 'utf-8')
console.log('Injected scheduled handler into worker.ts')
