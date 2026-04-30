import type { RenderingStrategy } from './types'

export const THRESHOLD = {
  POPULATED_BODY: 200,
  EMPTY_SHELL: 100,
  LARGE_BODY: 500,
  CSR_CLIENT_MIN: 200,
} as const

export const STRATEGY_LABEL: Record<RenderingStrategy, string> = {
  'prerendered-no-csr': 'Pre-rendered (static, no JS)',
  'prerendered-with-csr': 'Pre-rendered (static + hydration)',
  'ssr-with-csr': 'SSR + Client Hydration',
  'csr-only': 'CSR / SPA Only',
  redirect: 'Redirects',
  error: 'Errors',
  unknown: 'Unknown',
}
