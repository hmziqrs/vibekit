import type { RenderingStrategy } from './types'

export const THRESHOLD = {
  CSR_CLIENT_MIN: 200,
  EMPTY_SHELL: 100,
  LARGE_BODY: 500,
  POPULATED_BODY: 200,
} as const

export const STRATEGY_LABEL: Record<RenderingStrategy, string> = {
  'csr-only': 'CSR / SPA Only',
  error: 'Errors',
  'prerendered-no-csr': 'Pre-rendered (static, no JS)',
  'prerendered-with-csr': 'Pre-rendered (static + hydration)',
  redirect: 'Redirects',
  'ssr-with-csr': 'SSR + Client Hydration',
  unknown: 'Unknown',
}
