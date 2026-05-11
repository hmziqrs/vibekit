<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import { page } from '$app/state'
  import { cn } from '$lib/utils'
  import { useAnalytics } from '$lib/use-analytics.svelte'

  const { children } = $props()
  const auth = getContext<AuthContext>('auth')
  let mobileMenuOpen = $state(false)
  let signingOut = $state(false)

  const firebaseConfig = import.meta.env.PUBLIC_FIREBASE_CONFIG as string | undefined

  $effect(() => {
    useAnalytics(firebaseConfig)
  })

  const navItems = [
    { href: '/app/dashboard', label: 'Dashboard' },
    { href: '/app/items', label: 'Items' },
    { href: '/app/profile', label: 'Profile' },
    { href: '/app/settings', label: 'Settings' },
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

  <div class="flex min-h-screen bg-surface-base">
    <!-- Mobile overlay -->
    {#if mobileMenuOpen}
      <div
        class="fixed inset-0 z-40 bg-black/50 md:hidden"
        role="presentation"
        onclick={closeMobileMenu}
        onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
      ></div>
    {/if}

    <!-- Sidebar -->
    <aside
      class={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.06] bg-surface transition-transform duration-200 md:relative md:translate-x-0',
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
            Admin Panel
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
          class="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col">
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
      </header>
      <main class="flex-1 p-6">
        {@render children()}
      </main>
    </div>
  </div>
