export interface BuildRouteExpectation {
  path: string
  expectedStrategy: 'prerendered-no-csr' | 'prerendered-with-csr' | 'ssr-with-csr' | 'csr-only'
  group: string
  description: string
}

export const BUILD_ROUTES: BuildRouteExpectation[] = [
  // (public) — prerendered at build time, no CSR
  { path: '/', expectedStrategy: 'prerendered-no-csr', group: '(public)', description: 'Homepage — prerendered static HTML, zero client JS' },
  { path: '/features', expectedStrategy: 'prerendered-no-csr', group: '(public)', description: 'Features — prerendered static HTML' },
  { path: '/pricing', expectedStrategy: 'prerendered-no-csr', group: '(public)', description: 'Pricing — prerendered static HTML' },
  { path: '/about', expectedStrategy: 'prerendered-no-csr', group: '(public)', description: 'About — prerendered static HTML' },
  { path: '/privacy', expectedStrategy: 'prerendered-no-csr', group: '(public)', description: 'Privacy — prerendered static HTML' },
  { path: '/terms', expectedStrategy: 'prerendered-no-csr', group: '(public)', description: 'Terms — prerendered static HTML' },

  // (public)/contact — SSR + CSR (form actions prevent prerendering)
  { path: '/contact', expectedStrategy: 'ssr-with-csr', group: '(public)/contact', description: 'Contact — server-rendered with client hydration (form actions block prerendering)' },

  // (blog) — SSR + CSR at request time
  { path: '/blog', expectedStrategy: 'ssr-with-csr', group: '(blog)', description: 'Blog index — server-rendered at request time' },

  // (auth) — SSR + CSR at request time
  { path: '/login', expectedStrategy: 'ssr-with-csr', group: '(auth)', description: 'Login — server-rendered at request time' },
  { path: '/register', expectedStrategy: 'ssr-with-csr', group: '(auth)', description: 'Register — server-rendered at request time' },
  { path: '/forgot-password', expectedStrategy: 'ssr-with-csr', group: '(auth)', description: 'Forgot password — server-rendered at request time' },
  { path: '/reset-password', expectedStrategy: 'ssr-with-csr', group: '(auth)', description: 'Reset password — server-rendered at request time' },
  { path: '/verify-email', expectedStrategy: 'ssr-with-csr', group: '(auth)', description: 'Verify email — server-rendered at request time' },

  // (app) — CSR-only SPA (worker serves empty shell)
  { path: '/app', expectedStrategy: 'csr-only', group: '(app)', description: 'App index — CSR SPA shell' },
  { path: '/app/dashboard', expectedStrategy: 'csr-only', group: '(app)', description: 'App dashboard — CSR SPA' },
  { path: '/app/items', expectedStrategy: 'csr-only', group: '(app)', description: 'App items — CSR SPA' },
  { path: '/app/profile', expectedStrategy: 'csr-only', group: '(app)', description: 'App profile — CSR SPA' },
  { path: '/app/settings', expectedStrategy: 'csr-only', group: '(app)', description: 'App settings — CSR SPA' },

  // (admin) — CSR-only SPA (worker serves empty shell)
  { path: '/admin', expectedStrategy: 'csr-only', group: '(admin)', description: 'Admin index — CSR SPA shell' },
  { path: '/admin/dashboard', expectedStrategy: 'csr-only', group: '(admin)', description: 'Admin dashboard — CSR SPA' },
  { path: '/admin/users', expectedStrategy: 'csr-only', group: '(admin)', description: 'Admin users — CSR SPA' },
  { path: '/admin/blog', expectedStrategy: 'csr-only', group: '(admin)', description: 'Admin blog — CSR SPA' },
  { path: '/admin/audit', expectedStrategy: 'csr-only', group: '(admin)', description: 'Admin audit — CSR SPA' },
]
