export type RenderingStrategy =
  | 'prerendered-no-csr'
  | 'prerendered-with-csr'
  | 'ssr-with-csr'
  | 'csr-only'
  | 'redirect'
  | 'error'
  | 'unknown'

export interface RouteConfig {
  path: string
  expectedStrategy: RenderingStrategy
  devStrategy: RenderingStrategy
  description: string
  group: string
  requiresAuth: boolean
  requiresDb: boolean
}

export const ROUTES: RouteConfig[] = [
  // (public) — prerendered, no CSR (csr=false in +layout.ts)
  {
    path: '/',
    expectedStrategy: 'prerendered-no-csr',
    devStrategy: 'prerendered-no-csr',
    description: 'Homepage is prerendered static HTML',
    group: '(public)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/features',
    expectedStrategy: 'prerendered-no-csr',
    devStrategy: 'prerendered-no-csr',
    description: 'Features page is prerendered static HTML',
    group: '(public)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/pricing',
    expectedStrategy: 'prerendered-no-csr',
    devStrategy: 'prerendered-no-csr',
    description: 'Pricing page is prerendered static HTML',
    group: '(public)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/about',
    expectedStrategy: 'prerendered-no-csr',
    devStrategy: 'prerendered-no-csr',
    description: 'About page is prerendered static HTML',
    group: '(public)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/privacy',
    expectedStrategy: 'prerendered-no-csr',
    devStrategy: 'prerendered-no-csr',
    description: 'Privacy page is prerendered static HTML',
    group: '(public)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/terms',
    expectedStrategy: 'prerendered-no-csr',
    devStrategy: 'prerendered-no-csr',
    description: 'Terms page is prerendered static HTML',
    group: '(public)',
    requiresAuth: false,
    requiresDb: false,
  },

  // (public)/contact — SSR + CSR (cannot prerender due to form actions)
  {
    path: '/contact',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Contact page is server-rendered with client hydration (form actions prevent prerendering)',
    group: '(public)/contact',
    requiresAuth: false,
    requiresDb: false,
  },

  // (blog) — SSR + CSR hydration with edge caching
  {
    path: '/blog',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Blog index is server-side rendered with client hydration',
    group: '(blog)',
    requiresAuth: false,
    requiresDb: true,
  },

  // (auth) — default SSR + CSR hydration
  {
    path: '/login',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Login page is server-side rendered with client hydration',
    group: '(auth)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/register',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Register page is server-side rendered with client hydration',
    group: '(auth)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/forgot-password',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Forgot password page is server-side rendered with client hydration',
    group: '(auth)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/reset-password',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Reset password page is server-side rendered with client hydration',
    group: '(auth)',
    requiresAuth: false,
    requiresDb: false,
  },
  {
    path: '/verify-email',
    expectedStrategy: 'ssr-with-csr',
    devStrategy: 'ssr-with-csr',
    description: 'Verify email page is server-side rendered with client hydration',
    group: '(auth)',
    requiresAuth: false,
    requiresDb: false,
  },

  // (app) — CSR-only SPA, redirects to login when unauthenticated
  {
    path: '/app',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: '/app redirects to /app/dashboard',
    group: '(app)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/app/dashboard',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'App dashboard redirects to login (unauthenticated)',
    group: '(app)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/app/items',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'App items redirects to login (unauthenticated)',
    group: '(app)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/app/profile',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'App profile redirects to login (unauthenticated)',
    group: '(app)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/app/settings',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'App settings redirects to login (unauthenticated)',
    group: '(app)',
    requiresAuth: true,
    requiresDb: false,
  },

  // (admin) — CSR-only SPA, redirects to login when unauthenticated
  {
    path: '/admin',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: '/admin redirects to /admin/dashboard',
    group: '(admin)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/admin/dashboard',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'Admin dashboard redirects to login (unauthenticated)',
    group: '(admin)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/admin/users',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'Admin users redirects to login (unauthenticated)',
    group: '(admin)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/admin/blog',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'Admin blog redirects to login (unauthenticated)',
    group: '(admin)',
    requiresAuth: true,
    requiresDb: false,
  },
  {
    path: '/admin/audit',
    expectedStrategy: 'redirect',
    devStrategy: 'redirect',
    description: 'Admin audit redirects to login (unauthenticated)',
    group: '(admin)',
    requiresAuth: true,
    requiresDb: false,
  },
]
