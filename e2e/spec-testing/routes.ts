import type { RouteConfig } from './types'

export const ROUTES: RouteConfig[] = [
  // (public) group — defaults to ssr=true, csr=true (NOT prerendered in current config)
  { path: '/', expectedStrategy: 'ssr-with-csr', description: 'Homepage is server-rendered with hydration', group: '(public)' },
  { path: '/features', expectedStrategy: 'ssr-with-csr', description: 'Features page is server-rendered with hydration', group: '(public)' },
  { path: '/pricing', expectedStrategy: 'ssr-with-csr', description: 'Pricing page is server-rendered with hydration', group: '(public)' },
  { path: '/about', expectedStrategy: 'ssr-with-csr', description: 'About page is server-rendered with hydration', group: '(public)' },
  { path: '/privacy', expectedStrategy: 'ssr-with-csr', description: 'Privacy page is server-rendered with hydration', group: '(public)' },
  { path: '/terms', expectedStrategy: 'ssr-with-csr', description: 'Terms page is server-rendered with hydration', group: '(public)' },

  // (public)/contact — explicitly overrides: prerender=false, csr=true
  { path: '/contact', expectedStrategy: 'csr-only', description: 'Contact page is NOT pre-rendered and relies on client-side rendering', group: '(public)/contact' },

  // (blog) group — ssr=true, csr=true (full SSR + hydration)
  { path: '/blog', expectedStrategy: 'ssr-with-csr', description: 'Blog index is server-side rendered with client hydration', group: '(blog)' },

  // (auth) group — no explicit config, inherits defaults (ssr=true, csr=true)
  { path: '/login', expectedStrategy: 'ssr-with-csr', description: 'Login page is server-side rendered with client hydration', group: '(auth)' },
  { path: '/register', expectedStrategy: 'ssr-with-csr', description: 'Register page is server-side rendered with client hydration', group: '(auth)' },
  { path: '/forgot-password', expectedStrategy: 'ssr-with-csr', description: 'Forgot password page is server-side rendered with client hydration', group: '(auth)' },
  { path: '/reset-password', expectedStrategy: 'ssr-with-csr', description: 'Reset password page is server-side rendered with client hydration', group: '(auth)' },
  { path: '/verify-email', expectedStrategy: 'ssr-with-csr', description: 'Verify email page is server-side rendered with client hydration', group: '(auth)' },

  // (app) / (admin) — tested via redirect assertions only since they require auth
  { path: '/app', expectedStrategy: 'redirect', description: '/app redirects to /app/dashboard', group: '(app)' },
  { path: '/app/dashboard', expectedStrategy: 'redirect', description: 'App dashboard redirects to login (unauthenticated)', group: '(app)' },
  { path: '/admin', expectedStrategy: 'redirect', description: '/admin redirects to /admin/dashboard', group: '(admin)' },
  { path: '/admin/dashboard', expectedStrategy: 'redirect', description: 'Admin dashboard redirects to login (unauthenticated)', group: '(admin)' },
]
