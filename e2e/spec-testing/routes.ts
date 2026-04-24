import type { RouteConfig } from './types'

export const ROUTES: RouteConfig[] = [
  // (public) group — prerendered=true, csr=false
  { path: '/', expectedStrategy: 'prerendered-no-csr', description: 'Homepage pre-rendered at build time with no client-side JS', group: '(public)' },
  { path: '/features', expectedStrategy: 'prerendered-no-csr', description: 'Features page pre-rendered at build time with no client-side JS', group: '(public)' },
  { path: '/pricing', expectedStrategy: 'prerendered-no-csr', description: 'Pricing page pre-rendered at build time with no client-side JS', group: '(public)' },
  { path: '/about', expectedStrategy: 'prerendered-no-csr', description: 'About page pre-rendered at build time with no client-side JS', group: '(public)' },
  { path: '/privacy', expectedStrategy: 'prerendered-no-csr', description: 'Privacy page pre-rendered at build time with no client-side JS', group: '(public)' },
  { path: '/terms', expectedStrategy: 'prerendered-no-csr', description: 'Terms page pre-rendered at build time with no client-side JS', group: '(public)' },

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
