<script lang="ts">
  import { createMutation, createQuery } from '@tanstack/svelte-query'

  const integrationsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/integrations')
      if (!res.ok) throw new Error('Failed to fetch integrations')
      return (await res.json()) as {
        integrations: {
          createdAt: string
          externalAccountId: string | null
          id: string
          lastError: string | null
          lastSyncedAt: string | null
          metadata: Record<string, unknown> | null
          provider: string
          scopes: string[]
          status: string
          tokenExpiresAt: string | null
        }[]
      }
    },
    queryKey: ['integrations'],
  }))

  const providersQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/integrations/providers')
      if (!res.ok) throw new Error('Failed to fetch providers')
      return (await res.json()) as {
        providers: {
          configured: boolean
          provider: {
            category: string
            description: string
            icon: string
            name: string
            scopes: string[]
            slug: string
          }
        }[]
      }
    },
    queryKey: ['integration-providers'],
  }))

  const connectMutation = createMutation(() => ({
    mutationFn: async (provider: string) => {
      const res = await fetch(`/api/integrations/connect/${provider}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to connect')
      return (await res.json()) as { url: string }
    },
    onSuccess: (data) => {
      window.location.href = data.url
    },
  }))

  const disconnectMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/integrations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
    },
    onSuccess: () => integrationsQuery.refetch(),
  }))

  const refreshMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/integrations/${id}/refresh`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to refresh')
      return await res.json()
    },
    onSuccess: () => integrationsQuery.refetch(),
  }))

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString()
  }

  const statusColors: Record<string, string> = {
    active: 'bg-success/15 text-success',
    disconnected: 'bg-white/[0.06] text-text-muted',
    error: 'bg-destructive/15 text-destructive',
    expired: 'bg-warning/15 text-warning',
  }

  function getConnected(integrations: { provider: string }[], slug: string) {
    return integrations.some((i) => i.provider === slug)
  }

  const providerIcons: Record<string, string> = {
    discord: '💬',
    github: '🐙',
    linear: '📊',
    notion: '📝',
    slack: '📱',
  }
</script>

<div class="space-y-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold text-text-primary">Integrations</h1>
      <p class="mt-1 text-sm text-text-muted">Connect third-party services to your account</p>
    </div>
  </div>

  <!-- Available Providers -->
  {#if providersQuery.isPending}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if providersQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load integration providers.</p>
      <button
        onclick={() => providersQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if providersQuery.isSuccess && providersQuery.data}
    {@const byCategory = Object.groupBy(
      providersQuery.data.providers,
      (p) => p.provider.category,
    )}

    {#each Object.entries(byCategory ?? {}) as [category, providers] (category)}
      <div>
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
          {category}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each providers ?? [] as { configured, provider } (provider.slug)}
            {@const connected = integrationsQuery.isSuccess &&
              integrationsQuery.data &&
              getConnected(integrationsQuery.data.integrations, provider.slug)}

            <div
              class="rounded-lg border border-white/[0.06] bg-surface p-5 transition-colors hover:border-white/[0.1]"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{providerIcons[provider.slug] ?? '🔌'}</span>
                  <div>
                    <h3 class="font-medium text-text-primary">{provider.name}</h3>
                    <p class="text-xs text-text-muted">{provider.description}</p>
                  </div>
                </div>
                {#if connected}
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-success/15 text-success"
                  >
                    Connected
                  </span>
                {/if}
              </div>

              <div class="mt-4">
                {#if connected}
                  <span class="text-xs text-text-subtle">Already connected</span>
                {:else if !configured}
                  <span class="text-xs text-warning">Not configured by admin</span>
                {:else}
                  <button
                    onclick={() => connectMutation.mutate(provider.slug)}
                    disabled={connectMutation.isPending}
                    class="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                  >
                    Connect
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}

  <!-- Active Integrations -->
  {#if integrationsQuery.isPending}
    <div class="space-y-3">
      {#each Array(2) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if integrationsQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load integrations.</p>
      <button
        onclick={() => integrationsQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if integrationsQuery.isSuccess && integrationsQuery.data && integrationsQuery.data.integrations.length > 0}
    <div>
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
        Active Connections
      </h2>
      <div class="space-y-3">
        {#each integrationsQuery.data.integrations as int (int.id)}
          <div class="rounded-lg border border-white/[0.06] bg-surface p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xl">{providerIcons[int.provider] ?? '🔌'}</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-text-primary capitalize">{int.provider}</span>
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColors[
                        int.status
                      ] ?? 'bg-white/[0.06] text-text-muted'}"
                    >
                      {int.status}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-4 text-xs text-text-subtle">
                    {#if int.scopes.length > 0}
                      <span>Scopes: {int.scopes.join(', ')}</span>
                    {/if}
                    {#if int.lastSyncedAt}
                      <span>Last synced: {formatDate(int.lastSyncedAt)}</span>
                    {/if}
                  </div>
                  {#if int.lastError}
                    <p class="mt-1 text-xs text-destructive">{int.lastError}</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  onclick={() => refreshMutation.mutate(int.id)}
                  disabled={refreshMutation.isPending}
                  class="rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  onclick={() => disconnectMutation.mutate(int.id)}
                  disabled={disconnectMutation.isPending}
                  class="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
