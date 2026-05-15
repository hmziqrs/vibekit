<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import AnnouncementBanner from '$lib/components/announcement-banner.svelte'
  import NotificationBell from '$lib/components/notification-bell.svelte'
  import SearchDialog from '$lib/components/search-dialog.svelte'
  import ShortcutsHelp from '$lib/components/shortcuts-help.svelte'
  import LanguageSwitcher from '$lib/components/language-switcher.svelte'
  import { page } from '$app/state'
  import { cn } from '$lib/utils'
  import { useAnalytics } from '$lib/use-analytics.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { initWebVitals, reportToConsole } from '$lib/performance.svelte'

  const { children } = $props()
  const auth = getContext<AuthContext>('auth')
  let mobileMenuOpen = $state(false)
  let signingOut = $state(false)
  let searchOpen = $state(false)
  let shortcutsOpen = $state(false)
  let stoppingImpersonation = $state(false)
  let needsTermsAcceptance = $state(false)
  let acceptingTerms = $state(false)

  $effect(() => {
    if (page.data?.user) {
      fetch('/api/terms/status')
        .then((r) => r.json())
        .then((data) => {
          needsTermsAcceptance = data.needsAcceptance ?? false
        })
        .catch(() => {})
    }
  })

  async function acceptTerms() {
    acceptingTerms = true
    try {
      const res = await fetch('/api/terms/accept', { method: 'POST' })
      if (res.ok) needsTermsAcceptance = false
    } catch {
      // ignore
    } finally {
      acceptingTerms = false
    }
  }

  const impersonationInfo = $derived.by(() => {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem('impersonation')
    if (!raw) return null
    try {
      return JSON.parse(raw) as { sessionToken: string; targetEmail: string; targetName: string }
    } catch {
      return null
    }
  })

  async function stopImpersonation() {
    if (!impersonationInfo) return
    stoppingImpersonation = true
    try {
      await fetch(`/api/admin/users/${impersonationInfo.sessionToken}/stop-impersonate`, {
        body: JSON.stringify({ sessionToken: impersonationInfo.sessionToken }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }).catch(() => {})
      sessionStorage.removeItem('impersonation')
      window.location.href = '/admin/users'
    } finally {
      stoppingImpersonation = false
    }
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      searchOpen = true
    } else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault()
      shortcutsOpen = true
    }
  }

  const firebaseConfig = import.meta.env.PUBLIC_FIREBASE_CONFIG as string | undefined

  $effect(() => {
    initWebVitals()
    if (import.meta.env.DEV) reportToConsole()
  })

  $effect(() => {
    useAnalytics(firebaseConfig)
  })

  const navItems = [
    { href: '/app/dashboard', label: m.app_dashboard() },
    { href: '/app/items', label: m.app_items() },
    { href: '/app/notifications', label: m.app_notifications() },
    { href: '/app/organizations', label: m.app_organizations() },
    { href: '/app/invitations', label: m.app_invitations() },
    { href: '/app/profile', label: m.app_profile() },
    { href: '/app/settings', label: m.app_settings() },
    { href: '/app/settings/api-keys', label: m.app_api_keys() },
    { href: '/app/settings/integrations', label: m.app_integrations() },
    { href: '/app/settings/webhooks', label: m.app_webhooks() },
  ]

  async function handleSignOut() {
    signingOut = true
    await auth.logout('/')
    signingOut = false
  }

  function isActive(href: string) {
    return page.url.pathname === href || page.url.pathname.startsWith(`${href  }/`)
  }

  function closeMobileMenu() {
    mobileMenuOpen = false
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex min-h-screen bg-surface-base" onkeydown={handleSearchKeydown}>
    <SearchDialog bind:open={searchOpen} />
    <ShortcutsHelp bind:open={shortcutsOpen} />
    <!-- Mobile overlay -->
    {#if mobileMenuOpen}
      <div
        class="fixed inset-0 z-40 bg-foreground/50 md:hidden"
        role="presentation"
        onclick={closeMobileMenu}
        onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
      ></div>
    {/if}

    <!-- Sidebar -->
    <aside
      role="navigation"
      aria-label="Main navigation"
      class={cn(
        'fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-white/[0.06] bg-surface transition-transform duration-200 md:relative md:translate-x-0',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <!-- Logo -->
      <div class="flex h-14 items-center justify-between px-6">
        <a href="/" class="flex items-center gap-2.5">
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
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="text-[15px] font-semibold tracking-tight text-text-primary">Vibekit</span>
        </a>
        <button
          class="rounded-lg p-1 text-text-muted hover:bg-white/[0.04] hover:text-text-primary md:hidden"
          onclick={closeMobileMenu}
          aria-label="Close menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-1 px-3 pt-2">
        {#each navItems as item (item.href)}
          <a
            href={item.href}
            onclick={closeMobileMenu}
            class={cn(
              'block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              isActive(item.href)
                ? 'bg-white/[0.06] text-text-primary'
                : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
            )}
          >
            {item.label}
          </a>
        {/each}

        {#if auth.user?.role === 'admin'}
          <div class="my-3 border-t border-white/[0.06]"></div>
          <a
            href="/admin/dashboard"
            onclick={closeMobileMenu}
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {m.nav_admin()}
          </a>
        {/if}
      </nav>

      <!-- User section -->
      <div class="border-t border-white/[0.06] p-4">
        {#if auth.isPending}
          <div class="mb-3 flex items-center gap-3">
            <div class="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/[0.06]"></div>
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-3 w-20 animate-pulse rounded bg-white/[0.06]"></div>
              <div class="h-2 w-28 animate-pulse rounded bg-white/[0.06]"></div>
            </div>
          </div>
        {:else if auth.user}
          <div class="mb-3 flex items-center gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-medium text-text-secondary"
            >
              {auth.user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div class="min-w-0">
              <p class="truncate text-[13px] font-medium text-text-primary">
                {auth.user.name}
              </p>
              <p class="truncate text-[11px] text-text-subtle">{auth.user.email}</p>
            </div>
          </div>
        {/if}
        <button
          onclick={handleSignOut}
          disabled={signingOut}
          class="w-full rounded-lg px-3 py-2 text-start text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
        <div class="mt-2 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col">
      {#if impersonationInfo}
        <div class="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-6 py-2">
          <div class="flex items-center gap-2 text-[12px] text-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>
              Impersonating <strong>{impersonationInfo.targetName || impersonationInfo.targetEmail}</strong>
            </span>
          </div>
          <button
            class="rounded-md bg-warning/20 px-3 py-1 text-[11px] font-medium text-warning transition-colors hover:bg-warning/30 disabled:opacity-50"
            onclick={stopImpersonation}
            disabled={stoppingImpersonation}
          >
            {stoppingImpersonation ? 'Stopping...' : 'Stop Impersonating'}
          </button>
        </div>
      {/if}
      {#if needsTermsAcceptance}
        <div class="flex items-center justify-between gap-3 border-b border-brand/30 bg-brand/10 px-6 py-2">
          <div class="flex items-center gap-2 text-[12px] text-brand">
            <span>
              Our <a href="/terms" class="underline" target="_blank">Terms of Service</a> have been updated.
              Please review and accept to continue.
            </span>
          </div>
          <button
            class="rounded-md bg-brand/20 px-3 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/30 disabled:opacity-50"
            onclick={acceptTerms}
            disabled={acceptingTerms}
          >
            {acceptingTerms ? 'Accepting...' : 'Accept Terms'}
          </button>
        </div>
      {/if}
      <AnnouncementBanner />
      <header class="flex h-14 items-center justify-between border-b border-white/[0.06] px-6">
        <button
          class="rounded-lg p-1 text-text-muted hover:bg-white/[0.04] hover:text-text-primary md:hidden"
          onclick={() => (mobileMenuOpen = true)}
          aria-label="Open menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <span class="text-[14px] font-medium text-text-secondary">App</span>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            onclick={() => (searchOpen = true)}
            aria-label="Search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span class="hidden sm:inline">Search...</span>
            <kbd class="hidden sm:inline-flex rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[10px] text-text-faint">&#8984;K</kbd>
          </button>
          <NotificationBell />
        </div>
      </header>
      <main class="flex-1 p-6">
        {@render children()}
      </main>
    </div>
  </div>
