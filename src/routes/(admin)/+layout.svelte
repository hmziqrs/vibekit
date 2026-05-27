<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import { page } from '$app/state'
  import { cn } from '$lib/utils'
  import { useAnalytics } from '$lib/use-analytics.svelte'
  import LanguageSwitcher from '$lib/components/language-switcher.svelte'
  import * as m from '$lib/paraglide/messages.js'

  const { children } = $props()
  const auth = getContext<AuthContext>('auth')
  let mobileOpen = $state(false)
  let signingOut = $state(false)

  const firebaseConfig = import.meta.env.PUBLIC_FIREBASE_CONFIG as string | undefined

  useAnalytics(firebaseConfig)

  const navItems = [
    { href: '/admin/dashboard', icon: 'dashboard', label: m.admin_dashboard() },
    { href: '/admin/users', icon: 'users', label: m.admin_users() },
    { href: '/admin/api-keys', icon: 'key', label: 'API Keys' },
    { href: '/admin/blog', icon: 'blog', label: m.admin_blog() },
    { href: '/admin/media', icon: 'media', label: m.admin_media() },
    { href: '/admin/moderation', icon: 'moderation', label: m.admin_moderation() },
    { href: '/admin/audit', icon: 'audit', label: m.admin_audit() },
    { href: '/admin/integrations', icon: 'webhooks', label: m.admin_integrations() },
    { href: '/admin/feature-flags', icon: 'flags', label: m.admin_feature_flags() },
    { href: '/admin/experiments', icon: 'experiment', label: m.admin_experiments() },
    { href: '/admin/webhooks', icon: 'webhooks', label: m.admin_webhooks() },
    { href: '/admin/settings', icon: 'settings', label: m.admin_settings() },
  ]

  function isActive(href: string) {
    return page.url.pathname === href || page.url.pathname.startsWith(`${href  }/`)
  }

  async function handleSignOut() {
    signingOut = true
    await auth.logout('/')
    signingOut = false
  }

  function closeMobile() {
    mobileOpen = false
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

  <div class="flex min-h-screen bg-surface-base">
    <!-- Mobile overlay -->
    {#if mobileOpen}
      <div
        class="fixed inset-0 z-40 bg-foreground/60 md:hidden"
        role="button"
        tabindex="-1"
        aria-label="Close sidebar"
        onclick={closeMobile}
        onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') closeMobile() }}
      ></div>
    {/if}

    <!-- Sidebar -->
    <aside
      class={cn(
        'fixed inset-y-0 start-0 z-50 w-64 transform border-e border-border bg-surface transition-transform duration-200 md:static md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div class="flex h-14 items-center justify-between px-6">
        <a href="/admin" class="flex items-center gap-2.5" onclick={closeMobile}>
          <div
            class="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span class="text-[15px] font-semibold tracking-tight text-text-primary">Admin</span>
        </a>
        <button
          class="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text-primary md:hidden"
          onclick={closeMobile}
          aria-label="Close sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav class="mt-4 space-y-1 px-3">
        {#each navItems as item (item.href)}
          <a
            href={item.href}
            class={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              isActive(item.href)
                ? 'bg-brand/10 text-brand'
                : 'text-text-muted hover:bg-surface hover:text-text-primary',
            )}
            onclick={closeMobile}
          >
            <span class="icon">
              {#if item.icon === 'dashboard'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              {:else if item.icon === 'users'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              {:else if item.icon === 'blog'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              {:else if item.icon === 'media'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              {:else if item.icon === 'audit'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              {:else if item.icon === 'moderation'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              {:else if item.icon === 'webhooks'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.42.57-2" />
                  <path d="M6 17H2v4" />
                  <path d="M12.58 4.89l2.33-1.67a2.16 2.16 0 0 1 2.84.35l2.34 2.34a2.16 2.16 0 0 1-.35 2.84l-1.67 2.33" />
                  <path d="M17 11l4 4-4 4" />
                  <path d="M8.6 5.53a4 4 0 1 0 6.07 4.72" />
                </svg>
              {:else if item.icon === 'flags'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              {:else if item.icon === 'experiment'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 3h6v7l4 8H5l4-8V3z" />
                  <line x1="9" y1="3" x2="15" y2="3" />
                  <path d="M10 14h4" />
                </svg>
              {:else if item.icon === 'settings'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              {:else if item.icon === 'key'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              {/if}
            </span>
            {item.label}
          </a>
        {/each}

        <div class="my-3 border-t border-border"></div>
        <a
          href="/app/dashboard"
          class={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
            'text-text-muted hover:bg-surface hover:text-text-primary',
          )}
          onclick={closeMobile}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back to App
        </a>
      </nav>

      <!-- Sidebar footer: user info + logout -->
      <div class="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        {#if auth.isPending}
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted"></div>
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-3 w-20 animate-pulse rounded bg-muted"></div>
              <div class="h-2 w-10 animate-pulse rounded bg-muted"></div>
            </div>
          </div>
        {:else if auth.user}
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[12px] font-semibold text-brand">
              {auth.user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[11px] text-text-subtle">{auth.user.email}</p>
              <p class="truncate text-[13px] font-medium text-text-primary">{auth.user.name || auth.user.email}</p>
              <span
                class={cn(
                  'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  auth.user?.role === 'admin'
                    ? 'bg-brand/20 text-brand'
                    : 'bg-muted text-text-muted',
                )}
              >
                {auth.user?.role ?? 'user'}
              </span>
            </div>
            <button
              class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-50"
              onclick={handleSignOut}
              disabled={signingOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <LanguageSwitcher />
          </div>
        {:else}
          <p class="text-[13px] text-text-muted">Not signed in</p>
        {/if}
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div class="flex items-center gap-3">
          <button
            class="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text-primary md:hidden"
            onclick={() => (mobileOpen = true)}
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span class="text-[14px] font-medium text-text-secondary">Admin Panel</span>
        </div>
      </header>
      <main class="flex-1 p-6 pb-12">
        {@render children()}
      </main>
    </div>
  </div>
