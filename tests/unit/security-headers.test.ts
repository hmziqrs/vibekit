import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('security headers configuration', () => {
  it('sets X-Frame-Options to DENY', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("'X-Frame-Options', 'DENY'")
  })

  it('sets Cross-Origin-Opener-Policy', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("'Cross-Origin-Opener-Policy', 'same-origin'")
  })

  it('sets Cross-Origin-Resource-Policy', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("'Cross-Origin-Resource-Policy', 'same-origin'")
  })

  it('sets X-Content-Type-Options', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("'X-Content-Type-Options', 'nosniff'")
  })

  it('sets Referrer-Policy', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("'Referrer-Policy', 'strict-origin-when-cross-origin'")
  })

  it('sets Permissions-Policy', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain(
      "'Permissions-Policy', 'camera=(), microphone=(), geolocation=()'"
    )
  })

  it('sets HSTS only for HTTPS', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("'Strict-Transport-Security'")
    expect(hooksSource).toContain("event.url.protocol === 'https:'")
    expect(hooksSource).toContain('max-age=63072000')
    expect(hooksSource).toContain('includeSubDomains')
    expect(hooksSource).toContain('preload')
  })

  it('skips API routes for security headers', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).toContain("event.url.pathname.startsWith('/api/')")
  })

  it('does not set CSP manually (uses SvelteKit built-in)', () => {
    const hooksSource = readFileSync(resolve(process.cwd(), 'src/hooks.server.ts'), 'utf8')
    expect(hooksSource).not.toContain("'Content-Security-Policy',")
  })
})

describe('svelteKit CSP configuration', () => {
  it('has CSP config in svelte.config.js', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain('csp:')
    expect(configSource).toContain("mode: 'auto'")
  })

  it('includes frame-ancestors none in CSP', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain("'frame-ancestors': ['none']")
  })

  it('does not use unsafe-inline for script-src', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    // Extract the script-src line from config
    const scriptSrcMatch = configSource.match(/'script-src':\s*\[([^\]]+)\]/)
    expect(scriptSrcMatch).toBeTruthy()
    expect(scriptSrcMatch[1]).not.toContain('unsafe-inline')
  })

  it('allows unsafe-inline for style-src (required for Svelte transitions)', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    const styleSrcMatch = configSource.match(/'style-src':\s*\[([^\]]+)\]/)
    expect(styleSrcMatch).toBeTruthy()
    expect(styleSrcMatch[1]).toContain('unsafe-inline')
  })

  it('sets object-src to none', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain("'object-src': ['none']")
  })

  it('includes base-uri self', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain("'base-uri': ['self']")
  })

  it('includes form-action self', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain("'form-action': ['self']")
  })

  it('allows images from self, data, blob, and https', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain("'img-src': ['self', 'data:', 'blob:', 'https:']")
  })

  it('allows Cloudflare Insights scripts', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'svelte.config.js'), 'utf8')
    expect(configSource).toContain('https://static.cloudflareinsights.com')
  })
})
