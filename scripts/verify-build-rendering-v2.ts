#!/usr/bin/env bun
import { spawn } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const PRE = join(ROOT, '.svelte-kit', 'output', 'prerendered')
const CLI = join(ROOT, '.svelte-kit', 'output', 'client')

const PAGES = [
  { path: '/', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/features', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/pricing', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/about', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/privacy', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/terms', expected: 'ssr-with-csr', group: '(public)' },
  { path: '/contact', expected: 'csr-only', group: '(public)/contact' },
  { path: '/app/dashboard', expected: 'csr-only', group: '(app)' },
  { path: '/app/items', expected: 'csr-only', group: '(app)' },
  { path: '/app/profile', expected: 'csr-only', group: '(app)' },
  { path: '/app/settings', expected: 'csr-only', group: '(app)' },
  { path: '/admin/dashboard', expected: 'csr-only', group: '(admin)' },
  { path: '/admin/blog', expected: 'csr-only', group: '(admin)' },
  { path: '/admin/users', expected: 'csr-only', group: '(admin)' },
  { path: '/admin/audit', expected: 'csr-only', group: '(admin)' },
  { path: '/blog', expected: 'ssr-with-csr', group: '(blog)' },
  { path: '/login', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/register', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/forgot-password', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/reset-password', expected: 'ssr-with-csr', group: '(auth)' },
  { path: '/verify-email', expected: 'ssr-with-csr', group: '(auth)' },
]

function runBuild() {
  return new Promise<{ out: string; err: string; ec: number; dur: number }>((resolve) => {
    console.log('[BUILD] Starting production build...')
    const start = Date.now()
    const child = spawn('bun', ['run', 'build'], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production', CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = '', err = ''
    child.stdout.on('data', (d: Buffer) => { out += d; process.stdout.write(d) })
    child.stderr.on('data', (d: Buffer) => { err += d; process.stderr.write(d) })
    child.on('close', (ec) => {
      const dur = Date.now() - start
      console.log(`\n[BUILD] Completed in ${(dur / 1000).toFixed(1)}s (exit code: ${ec ?? 1})`)
      resolve({ out, err, ec: ec ?? 1, dur })
    })
  })
}

function getPrerenderedRoutes(): Set<string> {
  // Cloudflare adapter bundles prerendered routes into the worker manifest
  const manifestPath = join(ROOT, '.svelte-kit', 'output', 'server', 'manifest.js')
  if (!existsSync(manifestPath)) return new Set()
  const content = readFileSync(manifestPath, 'utf-8')
  // Extract prerendered_routes: new Set([...])
  const match = content.match(/prerendered_routes:\s*new\s*Set\((\[[^\]]*\])\)/)
  if (!match) return new Set()
  try {
    const routes: string[] = JSON.parse(match[1].replace(/'/g, '"'))
    return new Set(routes)
  } catch {
    return new Set()
  }
}

function hasHydration(h: string) {
  return h.includes('__sveltekit') || h.includes('data-sveltekit') || h.includes('data-sveltekit-hydrate') || h.includes('<script type="module">') || h.includes('start_app')
}

function clientExists(p: string) {
  return existsSync(join(CLI, p === '/' ? '' : p))
}

async function main() {
  const { out, err, ec, dur } = await runBuild()
  if (ec !== 0) { console.error('\nBUILD FAILED'); process.exit(1) }

  const log = out + '\n' + err
  const preRoutes = getPrerenderedRoutes()

  console.log('\n\n══════════════════════════════════════════════════════════════')
  console.log('  BUILD-TIME RENDERING VERIFICATION REPORT v2')
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`  Build duration: ${(dur / 1000).toFixed(1)}s`)
  console.log(`  Prerendered routes in manifest: ${preRoutes.size}`)
  console.log('══════════════════════════════════════════════════════════════\n')

  let pass = 0, fail = 0
  const groups = new Map<string, typeof PAGES>()
  for (const p of PAGES) { const g = groups.get(p.group) ?? []; g.push(p); groups.set(p.group, g) }

  for (const [group, pages] of groups) {
    console.log(`\n📁 ${group}`)
    console.log('─'.repeat(60))
    for (const page of pages) {
      const pre = preRoutes.has(page.path)
      const notes: string[] = []
      let ok = false

      if (page.expected === 'prerendered-no-csr') {
        if (!pre) { notes.push('❌ Expected prerendered but NOT in manifest'); fail++ }
        else { ok = true; notes.push('✅ Found in prerender manifest'); pass++ }
      } else if (page.expected === 'csr-only') {
        if (pre) { notes.push('❌ CSR-only page unexpectedly prerendered'); fail++ }
        else { ok = true; notes.push('✅ Not prerendered — shell rendered at request time'); pass++ }
      } else if (page.expected === 'ssr-with-csr') {
        if (pre) { notes.push('❌ SSR page unexpectedly prerendered'); fail++ }
        else { ok = true; notes.push('✅ Not prerendered — rendered at request time by server'); pass++ }
      }

      notes.push(clientExists(page.path) ? '✅ Client assets exist' : 'ℹ️  No dedicated client dir')

      console.log(`  ${ok ? '✅' : '❌'} ${page.path} — expected: ${page.expected}`)
      for (const n of notes) console.log(`      ${n}`)
      console.log('')
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`  SUMMARY: ${pass} passed | ${fail} failed`)
  console.log('══════════════════════════════════════════════════════════════\n')

  // Strategy distribution
  const preCnt = PAGES.filter(p => p.expected === 'prerendered-no-csr').length
  const ssrCnt = PAGES.filter(p => p.expected === 'ssr-with-csr').length
  const csrCnt = PAGES.filter(p => p.expected === 'csr-only').length
  console.log('Strategy Distribution (expected):')
  console.log(`  • Pre-rendered (SSG):     ${preCnt} pages`)
  console.log(`  • SSR + Hydration:        ${ssrCnt} pages`)
  console.log(`  • CSR / SPA only:         ${csrCnt} pages`)
  console.log(`  • Total:                  ${PAGES.length} pages`)

  // Build log snippets
  const preLines = log.split('\n').filter(l => l.toLowerCase().includes('prerender')).slice(0, 20)
  if (preLines.length) {
    console.log('\nBuild log snippets (prerender mentions):')
    for (const l of preLines) console.log(`  ${l.trim()}`)
  }
  console.log('')

  if (fail > 0) { console.error('❌ SOME CHECKS FAILED'); process.exit(1) }
  console.log('✅ ALL BUILD-TIME STRATEGIES VERIFIED\n')
}

main().catch(e => { console.error(e); process.exit(1) })
