#!/usr/bin/env bun
import { spawn } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { BUILD_ROUTES } from './rendering-routes'
import type { BuildRouteExpectation } from './rendering-routes'

const ROOT = process.cwd()
const PRE = join(ROOT, '.svelte-kit', 'output', 'prerendered')
const CLI = join(ROOT, '.svelte-kit', 'output', 'client')

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

function findPrerenderedFiles(dir: string, base = ''): Array<{ path: string; size: number; html: string }> {
  const results: Array<{ path: string; size: number; html: string }> = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    const relPath = join(base, entry)
    if (stat.isDirectory()) {
      results.push(...findPrerenderedFiles(fullPath, relPath))
    } else if (entry === 'index.html' || entry.endsWith('.html')) {
      const urlPath = relPath.replace(/index\.html$/, '').replace(/\.html$/, '')
      results.push({
        path: urlPath === '' ? '/' : '/' + urlPath,
        size: stat.size,
        html: readFileSync(fullPath, 'utf-8'),
      })
    }
  }
  return results
}

function getPrerenderedRoutesFromManifest(): Set<string> {
  const manifestPath = join(ROOT, '.svelte-kit', 'output', 'server', 'manifest.js')
  if (!existsSync(manifestPath)) return new Set()
  const content = readFileSync(manifestPath, 'utf-8')
  const match = content.match(/prerendered_routes:\s*new\s*Set\((\[[^\]]*\])\)/)
  if (!match) return new Set()
  try {
    const routes: string[] = JSON.parse(match[1].replace(/'/g, '"'))
    return new Set(routes)
  } catch {
    return new Set()
  }
}

function hasHydrationScripts(html: string): boolean {
  return (
    html.includes('__sveltekit') ||
    html.includes('data-sveltekit') ||
    html.includes('data-sveltekit-hydrate') ||
    html.includes('<script type="module">') ||
    html.includes('start_app')
  )
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

function clientAssetsExist(path: string): boolean {
  return existsSync(join(CLI, path === '/' ? '' : path))
}

async function main() {
  const { out, err, ec, dur } = await runBuild()
  if (ec !== 0) {
    console.error('\nBUILD FAILED — cannot verify rendering strategies')
    process.exit(1)
  }

  const buildLog = out + '\n' + err
  const preFiles = findPrerenderedFiles(PRE)
  const preMap = new Map(preFiles.map((f) => [f.path, f]))
  const manifestRoutes = getPrerenderedRoutesFromManifest()

  console.log('\n')
  console.log('='.repeat(70))
  console.log('  BUILD-TIME RENDERING VERIFICATION REPORT')
  console.log('='.repeat(70))
  console.log(`  Build duration: ${(dur / 1000).toFixed(1)}s`)
  console.log(`  Prerendered .html files: ${preFiles.length}`)
  console.log(`  Prerendered routes in manifest: ${manifestRoutes.size}`)
  console.log('='.repeat(70))

  let totalPass = 0
  let totalFail = 0
  const groups = new Map<string, typeof BUILD_ROUTES>()
  for (const p of BUILD_ROUTES) {
    const g = groups.get(p.group) ?? []
    g.push(p)
    groups.set(p.group, g)
  }

  for (const [group, pages] of groups) {
    console.log(`\n${group}`)
    console.log('-'.repeat(60))

    for (const page of pages) {
      const preFile = preMap.get(page.path)
      const inManifest = manifestRoutes.has(page.path)
      const notes: string[] = []
      let pass = false

      if (page.expectedStrategy === 'prerendered-no-csr') {
        if (!preFile && !inManifest) {
          notes.push('Expected prerendered but NO .html file and NOT in manifest')
        } else {
          pass = true
          if (preFile) {
            notes.push(`Prerendered HTML found (${preFile.size.toLocaleString()} bytes)`)
            const bodyLen = extractBodyTextLength(preFile.html)
            notes.push(`Body text: ${bodyLen} chars`)
            if (hasHydrationScripts(preFile.html)) {
              notes.push('WARNING: hydration scripts found in prerendered HTML (expected no CSR)')
            } else {
              notes.push('No hydration scripts (csr=false confirmed)')
            }
          }
          if (inManifest) {
            notes.push('Listed in prerendered_routes manifest')
          }
        }
      } else if (page.expectedStrategy === 'prerendered-with-csr') {
        if (!preFile && !inManifest) {
          notes.push('Expected prerendered-with-csr but NO .html file and NOT in manifest')
        } else {
          pass = true
          if (preFile) {
            notes.push(`Prerendered HTML found (${preFile.size.toLocaleString()} bytes)`)
            const bodyLen = extractBodyTextLength(preFile.html)
            notes.push(`Body text: ${bodyLen} chars`)
            if (hasHydrationScripts(preFile.html)) {
              notes.push('Hydration scripts present (csr=true confirmed)')
            } else {
              notes.push('WARNING: no hydration scripts (expected csr=true)')
            }
          }
          if (inManifest) {
            notes.push('Listed in prerendered_routes manifest')
          }
        }
      } else if (page.expectedStrategy === 'csr-only' || page.expectedStrategy === 'redirect') {
        if (inManifest) {
          notes.push('CSR/redirect page unexpectedly in prerender manifest')
        } else if (preFile) {
          notes.push('CSR/redirect page unexpectedly has prerendered .html file')
        } else {
          pass = true
          notes.push('Not prerendered — served at request time by worker')
        }
      } else if (page.expectedStrategy === 'ssr-with-csr') {
        if (inManifest) {
          notes.push('SSR page unexpectedly in prerender manifest')
        } else if (preFile) {
          notes.push('SSR page unexpectedly has prerendered .html file')
        } else {
          pass = true
          notes.push('Not prerendered — rendered at request time by Cloudflare Worker')
        }
      }

      notes.push(clientAssetsExist(page.path) ? 'Client assets exist' : 'No dedicated client dir')

      const icon = pass ? 'PASS' : 'FAIL'
      console.log(`  [${icon}] ${page.path}`)
      console.log(`     Expected: ${page.expectedStrategy}`)
      for (const n of notes) console.log(`     ${n}`)
      console.log('')

      if (pass) totalPass++
      else totalFail++
    }
  }

  console.log('='.repeat(70))
  console.log(`  SUMMARY: ${totalPass} passed | ${totalFail} failed`)
  console.log('='.repeat(70))

  const preNoCsr = BUILD_ROUTES.filter((p) => p.expectedStrategy === 'prerendered-no-csr').length
  const preWithCsr = BUILD_ROUTES.filter((p) => p.expectedStrategy === 'prerendered-with-csr').length
  const ssrCnt = BUILD_ROUTES.filter((p) => p.expectedStrategy === 'ssr-with-csr').length
  const csrCnt = BUILD_ROUTES.filter((p) => p.expectedStrategy === 'csr-only' || p.expectedStrategy === 'redirect').length

  console.log('')
  console.log('  Strategy Distribution:')
  console.log(`    Pre-rendered (static, no JS):   ${preNoCsr} pages`)
  if (preWithCsr > 0) console.log(`    Pre-rendered (static + hydrate): ${preWithCsr} pages`)
  console.log(`    SSR + Hydration (request time):  ${ssrCnt} pages`)
  console.log(`    CSR / SPA / Redirects:           ${csrCnt} pages`)
  console.log(`    Total:                           ${BUILD_ROUTES.length} pages`)

  const preLines = buildLog.split('\n').filter((l) => l.toLowerCase().includes('prerender')).slice(0, 20)
  if (preLines.length) {
    console.log('')
    console.log('  Build log (prerender mentions):')
    for (const l of preLines) console.log(`    ${l.trim()}`)
  }
  console.log('')

  if (totalFail > 0) {
    console.error('SOME CHECKS FAILED')
    process.exit(1)
  }
  console.log('ALL BUILD-TIME STRATEGIES VERIFIED')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
