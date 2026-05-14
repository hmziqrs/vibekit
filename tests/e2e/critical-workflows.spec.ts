import { expect, test, type Page } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

// ─── Public pages ──────────────────────────────────────────────

test.describe('public pages', () => {
  test('homepage loads and has title', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/Vibekit/)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('pricing page shows two plans', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Simple, predictable pricing' })).toBeVisible()
    await expect(page.getByText('Starter')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
    await expect(page.getByText('$0 /month')).toBeVisible()
    await expect(page.getByText('$29 /month')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get started free' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start free trial' })).toBeVisible()
  })

  test('pricing page has FAQ section', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    await expect(page.getByText('Frequently asked questions')).toBeVisible()
    await expect(page.getByText('Can I switch plans later?')).toBeVisible()
  })

  test('features page loads', async ({ page }) => {
    const res = await page.goto('/features', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/Features/)
  })

  test('blog index shows articles and search', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible()
    await expect(page.getByPlaceholder('Search articles...')).toBeVisible()
    // Tag filters present
    await expect(page.getByText('Showing')).toBeVisible()
  })

  test('blog post page has content and metadata', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState('networkidle')
      // Post should have heading, author, reading time
      await expect(page.locator('article')).toBeVisible()
      await expect(page.getByText(/min read/).first()).toBeVisible()
    }
  })

  test('contact page loads', async ({ page }) => {
    const res = await page.goto('/contact', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
  })

  test('privacy page loads', async ({ page }) => {
    const res = await page.goto('/privacy', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
  })

  test('terms page loads', async ({ page }) => {
    const res = await page.goto('/terms', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
  })
})

// ─── Public pages SEO ──────────────────────────────────────────

test.describe('SEO meta tags on public pages', () => {
  test('homepage has og:url meta tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const ogUrl = await page.evaluate(() => {
      const el = document.querySelector('meta[property="og:url"]')
      return el?.getAttribute('content')
    })
    expect(ogUrl).toBeTruthy()
  })

  test('pricing page has no noindex tag', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    const robots = await page.evaluate(() => {
      const el = document.querySelector('meta[name="robots"]')
      return el?.getAttribute('content')
    })
    // Public pages should NOT have noindex
    expect(robots).toBeFalsy()
  })

  test('blog post has og:image', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState('networkidle')
      const ogImage = await page.evaluate(() => {
        const el = document.querySelector('meta[property="og:image"]')
        return el?.getAttribute('content')
      })
      // og:image should be present (either cover or default)
      expect(ogImage).toBeTruthy()
    }
  })
})

// ─── Auth-protected pages have noindex ─────────────────────────

test.describe('noindex on protected routes', () => {
  test('app routes have noindex,nofollow', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    const robots = await page.evaluate(() => {
      const el = document.querySelector('meta[name="robots"]')
      return el?.getAttribute('content')
    })
    expect(robots).toBe('noindex,nofollow')
  })

  test('admin routes have noindex,nofollow', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    const robots = await page.evaluate(() => {
      const el = document.querySelector('meta[name="robots"]')
      return el?.getAttribute('content')
    })
    expect(robots).toBe('noindex,nofollow')
  })
})

// ─── App dashboard ─────────────────────────────────────────────

test.describe('app dashboard', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('dashboard shows welcome message', async () => {
    await authedPage.goto('/app/dashboard', { waitUntil: 'networkidle' })
    await expect(authedPage.getByText(/Welcome back/)).toBeVisible()
  })

  test('dashboard shows stat cards', async () => {
    await expect(authedPage.getByText('Active Items')).toBeVisible()
    await expect(authedPage.getByText('Total Created')).toBeVisible()
    await expect(authedPage.getByText('This Week')).toBeVisible()
  })

  test('dashboard shows quick actions', async () => {
    await expect(authedPage.getByRole('link', { name: 'New Item' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Edit Profile' })).toBeVisible()
  })

  test('sidebar navigation has all sections', async () => {
    await expect(authedPage.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Items' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Notifications' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Organizations' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Profile' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Settings' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'API Keys' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Integrations' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Webhooks' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Admin Panel' })).toBeVisible()
  })

  test('search bar is visible with keyboard shortcut hint', async () => {
    await expect(authedPage.getByText('Search...')).toBeVisible()
    await expect(authedPage.getByText('⌘K')).toBeVisible()
  })

  test('notification bell is visible', async () => {
    await expect(authedPage.getByRole('button', { name: 'Notifications' })).toBeVisible()
  })

  test('recent activity section loads', async () => {
    await expect(authedPage.getByText('Recent Activity')).toBeVisible()
  })
})

// ─── Notifications page ────────────────────────────────────────

test.describe('notifications page', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('shows heading and controls', async () => {
    await authedPage.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Mark all read' })).toBeVisible()
  })

  test('has type filter dropdown', async () => {
    const typeFilter = authedPage.locator('select').first()
    await expect(typeFilter).toBeVisible()
    const options = typeFilter.locator('option')
    await expect(options.nth(0)).toHaveText('All types')
  })

  test('has read status filter dropdown', async () => {
    const statusFilter = authedPage.locator('select').nth(1)
    await expect(statusFilter).toBeVisible()
    const options = statusFilter.locator('option')
    await expect(options.nth(0)).toHaveText('All')
  })

  test('notifications API returns valid structure', async () => {
    const res = await authedPage.request.get('/api/notifications')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('notifications')
    expect(data).toHaveProperty('total')
    expect(typeof data.total).toBe('number')
  })
})

// ─── Settings page ─────────────────────────────────────────────

test.describe('settings page', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('shows all settings sections', async () => {
    await authedPage.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(authedPage.getByText('Change Password')).toBeVisible()
    await expect(authedPage.getByText('Two-Factor Authentication')).toBeVisible()
    await expect(authedPage.getByText('Connected Accounts')).toBeVisible()
    await expect(authedPage.getByText('Active Sessions')).toBeVisible()
    await expect(authedPage.getByText('Security Activity')).toBeVisible()
    await expect(authedPage.getByText('Passkeys')).toBeVisible()
    await expect(authedPage.getByText('Export Your Data')).toBeVisible()
    await expect(authedPage.getByText('Deactivate Account')).toBeVisible()
    await expect(authedPage.getByText('Delete Account')).toBeVisible()
  })

  test('shows connected accounts with Google and GitHub', async () => {
    await expect(authedPage.getByText('Google')).toBeVisible()
    await expect(authedPage.getByText('GitHub')).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Connect' }).first()).toBeVisible()
  })

  test('shows active sessions list', async () => {
    await expect(authedPage.getByText('Chrome on macOS')).toBeVisible()
  })

  test('shows security activity entries', async () => {
    // Should have at least a sign-in event
    await expect(authedPage.getByText('Sign In').first()).toBeVisible()
  })

  test('passkey section has add button', async () => {
    await expect(authedPage.getByRole('button', { name: 'Add Passkey' })).toBeVisible()
  })

  test('data export button exists', async () => {
    await expect(authedPage.getByRole('button', { name: 'Download My Data' })).toBeVisible()
  })
})

// ─── Admin dashboard ───────────────────────────────────────────

test.describe('admin dashboard', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('shows admin heading', async () => {
    await authedPage.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  })

  test('shows stat cards with values', async () => {
    await expect(authedPage.getByText('Users')).toBeVisible()
    await expect(authedPage.getByText('Blog Posts')).toBeVisible()
    await expect(authedPage.getByText('Items')).toBeVisible()
    await expect(authedPage.getByText('Active Users')).toBeVisible()
  })

  test('admin sidebar has all nav links', async () => {
    await expect(authedPage.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Users' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Blog' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Media' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Moderation' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Audit Log' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Integrations' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Feature Flags' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Experiments' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Webhooks' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Settings' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'Back to App' })).toBeVisible()
  })

  test('shows recent activity with entries', async () => {
    await expect(authedPage.getByText('Recent Activity')).toBeVisible()
    await expect(authedPage.getByText('View all')).toBeVisible()
  })
})

// ─── Admin blog management ─────────────────────────────────────

test.describe('admin blog management', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('blog list page shows posts table', async () => {
    await authedPage.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('heading', { name: 'Blog Posts' })).toBeVisible()
    await expect(authedPage.getByRole('link', { name: 'New Post' })).toBeVisible()
    // Table headers
    await expect(authedPage.getByText('Title')).toBeVisible()
    await expect(authedPage.getByText('Status')).toBeVisible()
  })

  test('blog list has status filter tabs', async () => {
    await expect(authedPage.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Draft' })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Scheduled' })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Published' })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Archived' })).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'Trash' })).toBeVisible()
  })

  test('blog list has search and sort controls', async () => {
    await expect(authedPage.getByPlaceholder('Search posts...')).toBeVisible()
    // Sort dropdown
    const sortSelect = authedPage.locator('select').last()
    await expect(sortSelect).toBeVisible()
  })

  test('blog list has pagination', async () => {
    await expect(authedPage.getByText(/Showing \d+-\d+ of \d+/)).toBeVisible()
  })
})

// ─── API key management ────────────────────────────────────────

test.describe('API keys page', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('API keys page loads with heading', async () => {
    await authedPage.goto('/app/settings/api-keys', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('heading', { name: /API Keys/i })).toBeVisible()
  })

  test('has create API key button', async () => {
    await expect(authedPage.getByRole('button', { name: /Create/i })).toBeVisible()
  })

  test('API keys endpoint returns data', async () => {
    const res = await authedPage.request.get('/api/api-keys')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

// ─── Auth redirection ──────────────────────────────────────────

test.describe('auth redirection', () => {
  test('unauthenticated user redirected from /app to login', async ({ page }) => {
    await page.goto('/app/dashboard')
    // Should be redirected away from the protected route
    expect(page.url()).not.toContain('/app/dashboard')
  })

  test('unauthenticated user redirected from /admin', async ({ page }) => {
    await page.goto('/admin/dashboard')
    expect(page.url()).not.toContain('/admin/dashboard')
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    // Should show login form or redirect to app if already authenticated
    const url = page.url()
    expect(url === '/login' || url.includes('/app')).toBe(true)
  })

  test('register page loads', async ({ page }) => {
    const res = await page.goto('/register', { waitUntil: 'networkidle' })
    expect(res?.status()).toBe(200)
  })
})

// ─── Skip link accessibility ───────────────────────────────────

test.describe('skip link accessibility', () => {
  test('public pages have skip to content link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeVisible()
  })

  test('app pages have skip to content link', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeVisible()
  })

  test('admin pages have skip to content link', async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeVisible()
  })
})

// ─── Language switcher ─────────────────────────────────────────

test.describe('language switcher', () => {
  test('language switcher is present on public pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /Change language/ })).toBeVisible()
  })

  test('language switcher shows English', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByText('English')).toBeVisible()
  })
})
