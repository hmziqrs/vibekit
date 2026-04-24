#!/usr/bin/env bun
/**
 * Build-Time Rendering Verification Script
 *
 * This script runs `vite build`, captures build logs, and inspects the
 * generated output to verify which pages are:
 *   - Pre-rendered (SSG) at build time
 *   - Server-side rendered (SSR) at request time
 *   - Client-side rendered (CSR/SPA) with no server HTML
 *
 * Usage: bun scripts/verify-build-rendering.ts
 */

import { spawn } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const OUTPUT_DIR = join(ROOT, '.svelte-kit', 'output')
const PRERENDER_DIR = join(OUTPUT_DIR, 'prerendered')
const CLIENT_DIR = join(OUTPUT_DIR, 'client')

interface PageReport {
  path: string
  expectedStrategy: string
  group: string
  prerendered: boolean
  prerenderFilePath?: string
  prerenderFileSize?: number
  serverRouteExists: boolean
  clientRouteExists: boolean
  hasHydrationScripts: boolean
  notes: string[]
}

const EXPECTED_PAGES: Array<{ path: string; expectedStrategy: string; group: string }> = [
  // (public) — prerendered, no CSR
  { path: '/', expectedStrategy: 'prerendered-no-csr', group: '(public)' },
  { path: '/features', expectedStrategy: 'prerendered-no-csr', group: '(public)' },
  { path: '/pricing', expectedStrategy: 'prerendered-no-csr', group: '(public)' },
  { path: '/about', expectedStrategy: 'prerendered-no-csr', group: '(public)' },
  { path: '/privacy', expectedStrategy: 'prerendered-no-csr', group: '(public)' },
  { path: '/terms', expectedStrategy: 'prerendered-no-csr', group: '(public)' },

  // (public)/contact — explicitly NOT prerendered
  { path: '/contact', expectedStrategy: 'csr-only', group: '(public)/contact' },

  // (app) — SPA mode
  { path: '/app/dashboard', expectedStrategy: 'csr-only', group: '(app)' },
  { path: '/app/items', expectedStrategy: 'csr-only', group: '(app)' },
  { path: '/app/profile', expectedStrategy: 'csr-only', group: '(app)' },
  { path: '/app/settings', expectedStrategy: 'csr-only', group: '(app)' },

  // (admin) — SPA mode
  { path: '/admin/dashboard', expectedStrategy: 'csr-only', group: '(admin)' },
  { path: '/admin/blog', expectedStrategy: 'csr-only', group: '(admin)' },
  { path: '/admin/users', expectedStrategy: 'csr-only', group: '(admin)' },
  { path: '/admin/audit', expectedStrategy: 'csr-only', group: '(admin)' },

  // (blog) — SSR + CSR
  { path: '/blog', expectedStrategy: 'ssr-with-csr', group: '(blog)' },

  // (auth) — default SSR + CSR
  { path: '/login', expectedStrategy: 'ssr-with-csr', group: '(auth)' },
  { path: '/register', expectedStrategy: 'ssr-with-csr', group: '(auth)' },
  { path: '/forgot-password', expectedStrategy: 'ssr-with-csr', group: '(auth)' },
  { path: '/reset-password', expectedStrategy: 'ssr-with-csr', group: '(auth)' },
  { path: '/verify-email', expectedStrategy: 'ssr-with-csr', group: '(auth)' },
]

function runBuild(): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    console.log('[BUILD] Starting vite build...\n')
    const startTime = Date.now()
    const child = spawn('bun', ['run', 'build'], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production', CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stdout += chunk
      process.stdout.write(chunk)
    })

    child.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stderr += chunk
      process.stderr.write(chunk)
    })

    child.on('close', (exitCode) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`\n[BUILD] Completed in ${duration}s (exit code: ${exitCode})`)
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 })
    })
  })
}

function findPrerenderedFiles(dir: string, base = ''): Array<{ path: string; filePath: string; size: number }> {
  const results: Array<{ path: string; filePath: string; size: number }> = []
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
        filePath: fullPath,
        size: stat.size,
      })
    }
  }
  return results
}

function hasHydrationScripts(html: string): boolean {
  return (
    html.includes('__sveltekit') ||
    html.includes('data-sveltekit') ||
    html.includes('data-sveltekit-hydrate') ||
    html.includes('import("./_app/') ||
    html.includes('<script type="module">')
  )
}

function analyzeBuildOutput(buildLog: string): PageReport[] {
  const prerenderedFiles = findPrerenderedFiles(PRERENDER_DIR)
  const prerenderPaths = new Map(prerenderedFiles.map((f) => [f.path, f]))

  const reports: PageReport[] = []

  for (const page of EXPECTED_PAGES) {
    const prerenderFile = prerenderPaths.get(page.path)
    const prerendered = !!prerenderFile
    const notes: string[] = []

    // Check build log for explicit prerender mentions
    const prerenderLogPattern = new RegExp(`prerender\\s+.*${page.path.replace(/\//g, '\\\\/')}`, 'i')
    const mentionedInLog = prerenderLogPattern.test(buildLog)

    if (page.expectedStrategy === 'prerendered-no-csr') {
      if (!prerendered) {
        notes.push(`EXPECTED pre-rendered but NO .html file found in .svelte-kit/output/prerendered/`)
      } else {
        notes.push(`Pre-rendered HTML file exists (${prerenderFile?.size ?? 0} bytes)`)
      }
    }

    if (page.expectedStrategy === 'csr-only' && prerendered) {
      notes.push(`UNEXPECTED: page is CSR-only but a pre-rendered HTML file was found`)
    }

    let hasHydration = false
    if (prerenderFile) {
      const html = readFileSync(prerenderFile.filePath, 'utf-8')
      hasHydration = hasHydrationScripts(html)
      if (!hasHydration && page.expectedStrategy === 'prerendered-no-csr') {
        notes.push('Confirmed: no hydration scripts in pre-rendered HTML (csr=false)')
      }
      if (hasHydration && page.expectedStrategy === 'prerendered-no-csr') {
        notes.push('WARNING: hydration scripts found in pre-rendered HTML despite csr=false')
      }
    }

    // Check for client-side JS bundles
    const clientRoutePath = join(CLIENT_DIR, page.path === '/' ? '' : page.path)
    const clientRouteExists = existsSync(clientRoutePath)

    reports.push({
      path: page.path,
      expectedStrategy: page.expectedStrategy,
      group: page.group,
      prerendered,
      prerenderFilePath: prerenderFile?.filePath,
      prerenderFileSize: prerenderFile?.size,
      serverRouteExists: false, // Cloudflare adapter bundles everything into a worker
      clientRouteExists,
      hasHydrationScripts: hasHydration,
      notes,
    })
  }

  return reports
}

function printReport(reports: PageReport[], buildLog: string) {
  console.log('\n\n══════════════════════════════════════════════════════════════')
  console.log('  BUILD-TIME RENDERING STRATEGY VERIFICATION REPORT')
  console.log('══════════════════════════════════════════════════════════════\n')

  // Group by strategy
  const byGroup = new Map<string, PageReport[]>()
  for (const r of reports) {
    const list = byGroup.get(r.group) ?? []
    list.push(r)
    byGroup.set(r.group, list)
  }

  let totalPassed = 0
  let totalFailed = 0

  for (const [group, pages] of byGroup) {
    console.log(`\n📁 ${group}`)
    console.log('─'.repeat(60))

    for (const page of pages) {
      const expectedPrerendered = page.expectedStrategy === 'prerendered-no-csr'
      const isCorrect =
        page.expectedStrategy === 'prerendered-no-csr'
          ? page.prerendered && !page.hasHydrationScripts
          : page.expectedStrategy === 'csr-only'
            ? !page.prerendered
            : page.expectedStrategy === 'ssr-with-csr'
              ? !page.prerendered // SSR pages are NOT pre-rendered files
              : true

      if (isCorrect) totalPassed++
      else totalFailed++

      const status = isCorrect ? 'PASS' : 'FAIL'
      const icon = isCorrect ? ' ' : ' '
      console.log(`  [${status}]${icon} ${page.path}`)
      console.log(`         Expected: ${page.expectedStrategy}`)
      console.log(`         Prerendered: ${page.prerendered ? 'YES' : 'NO'}`)
      if (page.prerenderFileSize) console.log(`         File size: ${page.prerenderFileSize} bytes`)
      console.log(`         Hydration scripts: ${page.hasHydrationScripts ? 'YES' : 'NO'}`)
      console.log(`         Client assets: ${page.clientRouteExists ? 'YES' : 'NO'}`)
      for (const note of page.notes) {
        console.log(`         ℹ️  ${note}`)
      }
      console.log('')
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`  SUMMARY: ${totalPassed} passed | ${totalFailed} failed`)
  console.log('══════════════════════════════════════════════════════════════\n')

  // Print prerender log summary
  const prerenderedCount = reports.filter((r) => r.prerendered).length
  const ssrCount = reports.filter((r) => r.expectedStrategy === 'ssr-with-csr').length
  const csrCount = reports.filter((r) => r.expectedStrategy === 'csr-only').length

  console.log('Strategy Distribution:')
  console.log(`  • Pre-rendered (SSG):     ${prerenderedCount} pages`)
  console.log(`  • SSR + Hydration:        ${ssrCount} pages`)
  console.log(`  • CSR / SPA only:         ${csrCount} pages`)
  console.log(`  • Total checked:          ${reports.length} pages`)
  console.log('')

  // Extract prerender lines from build log
  const prerenderLines = buildLog
    .split('\n')
    .filter((line) => line.toLowerCase().includes('prerender'))
    .slice(0, 30)

  if (prerenderLines.length > 0) {
    console.log('Build Log Snippets (prerender mentions):')
    for (const line of prerenderLines) {
      console.log(`  ${line.trim()}`)
    }
    console.log('')
  }

  return totalFailed === 0
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════')
  console.log('  BUILD RENDERING VERIFIER')
  console.log('══════════════════════════════════════════════════════════════\n')

  // Run the build
  const { stdout, stderr, exitCode } = await runBuild()
  const buildLog = stdout + '\n' + stderr

  if (exitCode !== 0) {
    console.error('\n❌ BUILD FAILED — cannot verify rendering strategies\n')
    process.exit(1)
  }

  // Analyze output
  if (!existsSync(OUTPUT_DIR)) {
    console.error(`\n❌ Output directory not found: ${OUTPUT_DIR}`)
    console.error('   The build may have failed or used a different output path.')
    process.exit(1)
  }

  const reports = analyzeBuildOutput(buildLog)
  const allPassed = printReport(reports, buildLog)

  if (!allPassed) {
    console.error('\n❌ SOME RENDERING STRATEGIES DO NOT MATCH EXPECTATIONS\n')
    process.exit(1)
  }

  console.log('\n✅ ALL RENDERING STRATEGIES VERIFIED SUCCESSFULLY\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
