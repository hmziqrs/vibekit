<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query'
  import { createQueryClient } from '$lib/query-client'
  import { useSession, signOut } from '$lib/auth-client'
  import { page } from '$app/stores'
  import { cn } from '$lib/utils'
  import { initAnalyticsIfConsented } from '$lib/analytics.svelte'

  let { children } = $props()
  const queryClient = createQueryClient()
  const session = useSession()
  let mobileOpen = $state(false)

  const firebaseConfig = import.meta.env.PUBLIC_FIREBASE_CONFIG as string | undefined

  $effect(() => {
    initAnalyticsIfConsented(firebaseConfig)
  })

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Users', href: '/admin/users', icon: 'users' },
    { label: 'Blog', href: '/admin/blog', icon: 'blog' },
    { label: 'Audit Log', href: '/admin/audit', icon: 'audit' },
  ]

  function isActive(href: string) {
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/')
  }

  function handleSignOut() {
    signOut()
    window.location.href = '/'
  }

  function closeMobile() {
    mobileOpen = false
  }
</script>

<QueryClientProvider client={queryClient}>
  <div class="flex min-h-screen bg-surface-base">
    <!-- Mobile overlay -->
    {#if mobileOpen}
      <div
        class="fixed inset-0 z-40 bg-black/60 md:hidden"
        role="button"
        tabindex="-1"
        aria-label="Close sidebar"
        onclick={closeMobile}
        onkeydown={(e) => e.key === 'Escape' && closeMobile()}
      ></div>
    {/if}

    <!-- Sidebar -->
    <aside
      class={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/[0.06] bg-surface transition-transform duration-200 md:static md:translate-x-0',
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
          class="rounded-md p-1 text-text-muted hover:bg-white/[0.04] hover:text-text-primary md:hidden"
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
        {#each navItems as item}
          <a
            href={item.href}
            class={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              isActive(item.href)
                ? 'bg-brand/10 text-brand'
                : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
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
              {:else if item.icon === 'audit'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              {/if}
            </span>
            {item.label}
          </a>
        {/each}
      </nav>

      <!-- Sidebar footer: user info + logout -->
      <div class="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] p-4">
        {#if $session.data?.user}
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[12px] font-semibold text-brand">
              {$session.data.user.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] font-medium text-text-primary">
                {$session.data.user.name || $session.data.user.email}
              </p>
              <span
                class={cn(
                  'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  ($session.data.user as Record<string, unknown>)?.role === 'admin'
                    ? 'bg-brand/20 text-brand'
                    : 'bg-white/[0.06] text-text-muted',
                )}
              >
                {($session.data.user as Record<string, unknown>)?.role ?? 'user'}
              </span>
            </div>
            <button
              class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
              onclick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        {:else}
          <p class="text-[13px] text-text-muted">Loading...</p>
        {/if}
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
        <div class="flex items-center gap-3">
          <button
            class="rounded-md p-1.5 text-text-muted hover:bg-white/[0.04] hover:text-text-primary md:hidden"
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
      <main class="flex-1 p-6">
        {@render children()}
      </main>
    </div>
  </div>
</QueryClientProvider>
