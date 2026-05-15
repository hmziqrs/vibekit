<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import { formatDate } from '$lib/i18n.svelte'
  import { cn } from '$lib/utils'
  import { createQuery } from '@tanstack/svelte-query'

  interface ApiKeyRow {
    createdAt: string
    expiresAt: string | null
    id: string
    keyPrefix: string
    lastUsedAt: string | null
    name: string
    rateLimit: number | null
    requestCount: number
    revokedAt: string | null
    scopes: string[]
    userEmail: string
    userName: string | null
  }

  let search = $state('')
  let statusFilter = $state('')
  let pageNum = $state(1)
  let confirmRevoke = $state<ApiKeyRow | null>(null)
  let showRevokeDialog = $state(false)
  let confirmDelete = $state<ApiKeyRow | null>(null)
  let showDeleteDialog = $state(false)
  let revoking = $state(false)
  let deleting = $state(false)

  const statusTabs = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Revoked', value: 'revoked' },
  ]

  const keysQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(pageNum))
      params.set('limit', '20')
      const res = await fetch(`/api/admin/api-keys?${params}`)
      if (!res.ok) throw new Error('Failed to fetch API keys')
      return res.json() as Promise<{
        apiKeys: ApiKeyRow[]
        page: number
        total: number
        totalPages: number
      }>
    },
    queryKey: ['admin', 'api-keys', { page: pageNum, search, status: statusFilter }],
    retry: 1,
  }))

  async function handleRevoke() {
    if (!confirmRevoke) return
    revoking = true
    try {
      const res = await fetch(`/api/admin/api-keys/${confirmRevoke.id}/revoke`, {
        method: 'POST',
      })
      if (res.ok) {
        showRevokeDialog = false
        confirmRevoke = null
        keysQuery.refetch()
      }
    } finally {
      revoking = false
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    deleting = true
    try {
      const res = await fetch(`/api/admin/api-keys/${confirmDelete.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showDeleteDialog = false
        confirmDelete = null
        keysQuery.refetch()
      }
    } finally {
      deleting = false
    }
  }

  function isExpired(key: ApiKeyRow): boolean {
    if (!key.expiresAt) return false
    return new Date(key.expiresAt) < new Date()
  }

  function formatScopes(scopes: string[]): string {
    if (scopes.length <= 2) return scopes.join(', ')
    return `${scopes.slice(0, 2).join(', ')} +${scopes.length - 2}`
  }
</script>

<div class="mx-auto max-w-6xl space-y-6 p-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-text-primary">API Keys</h1>
    <span class="text-[13px] text-text-muted">
      {keysQuery.data ? `${keysQuery.data.total} total` : 'Loading...'}
    </span>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-3">
    <div class="w-64">
      <SearchInput bind:value={search} placeholder="Search by key name or user..." />
    </div>
    <FilterTabs bind:value={statusFilter} tabs={statusTabs} />
  </div>

  <!-- Table -->
  {#if keysQuery.isPending}
    <div class="space-y-3">
      {#each Array(5) as _}
        <div class="h-16 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if keysQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load API keys.</p>
      <button
        onclick={() => keysQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if keysQuery.data && keysQuery.data.apiKeys.length > 0}
    <div class="overflow-hidden rounded-xl border border-white/[0.06]">
      <table class="w-full">
        <thead>
          <tr class="border-b border-white/[0.06] bg-white/[0.02]">
            <th class="px-4 py-3 text-left text-[12px] font-medium text-text-muted">Key</th>
            <th class="px-4 py-3 text-left text-[12px] font-medium text-text-muted">User</th>
            <th class="px-4 py-3 text-left text-[12px] font-medium text-text-muted">Scopes</th>
            <th class="px-4 py-3 text-left text-[12px] font-medium text-text-muted">Requests</th>
            <th class="px-4 py-3 text-left text-[12px] font-medium text-text-muted">Status</th>
            <th class="px-4 py-3 text-left text-[12px] font-medium text-text-muted">Created</th>
            <th class="px-4 py-3 text-right text-[12px] font-medium text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each keysQuery.data.apiKeys as key (key.id)}
            <tr class="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
              <td class="px-4 py-3">
                <p class="text-[13px] font-medium text-text-primary">{key.name}</p>
                <p class="text-[11px] font-mono text-text-faint">{key.keyPrefix}...</p>
              </td>
              <td class="px-4 py-3">
                <p class="text-[13px] text-text-primary">{key.userName ?? 'Unknown'}</p>
                <p class="text-[11px] text-text-faint">{key.userEmail}</p>
              </td>
              <td class="px-4 py-3">
                <span class="text-[12px] text-text-muted">{formatScopes(key.scopes)}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-[13px] text-text-muted">
                  {key.requestCount.toLocaleString()}
                </span>
                {#if key.rateLimit}
                  <p class="text-[10px] text-text-faint">{key.rateLimit}/min</p>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if key.revokedAt}
                  <span class="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    Revoked
                  </span>
                {:else if isExpired(key)}
                  <span class="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                    Expired
                  </span>
                {:else}
                  <span class="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    Active
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3 text-[12px] text-text-faint">
                {formatDate(key.createdAt)}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  {#if !key.revokedAt}
                    <button
                      onclick={() => {
                        confirmRevoke = key
                        showRevokeDialog = true
                      }}
                      class="rounded px-2 py-1 text-[11px] text-warning transition-colors hover:bg-warning/10"
                    >
                      Revoke
                    </button>
                  {/if}
                  <button
                    onclick={() => {
                      confirmDelete = key
                      showDeleteDialog = true
                    }}
                    class="rounded px-2 py-1 text-[11px] text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if keysQuery.data.totalPages > 1}
      <div class="flex items-center justify-center gap-2">
        <button
          onclick={() => (pageNum = Math.max(1, pageNum - 1))}
          disabled={pageNum <= 1}
          class="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-30"
        >
          Previous
        </button>
        <span class="text-[12px] text-text-faint">
          Page {keysQuery.data.page} of {keysQuery.data.totalPages}
        </span>
        <button
          onclick={() => (pageNum = Math.min(keysQuery.data!.totalPages, pageNum + 1))}
          disabled={pageNum >= keysQuery.data.totalPages}
          class="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-30"
        >
          Next
        </button>
      </div>
    {/if}
  {:else}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-8 text-center">
      <p class="text-text-muted">No API keys found</p>
      {#if search || statusFilter}
        <button
          onclick={() => {
            search = ''
            statusFilter = ''
          }}
          class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
        >
          Clear filters
        </button>
      {/if}
    </div>
  {/if}
</div>

<!-- Revoke Dialog -->
<ConfirmDialog
  open={showRevokeDialog}
  title="Revoke API Key"
  description="This will immediately disable the key. Any applications using it will lose access."
  confirmLabel={revoking ? 'Revoking...' : 'Revoke'}
  on:confirm={handleRevoke}
  on:cancel={() => {
    showRevokeDialog = false
    confirmRevoke = null
  }}
/>

<!-- Delete Dialog -->
<ConfirmDialog
  open={showDeleteDialog}
  title="Delete API Key"
  description="This will permanently delete the key and all its usage history. This cannot be undone."
  confirmLabel={deleting ? 'Deleting...' : 'Delete'}
  variant="destructive"
  on:confirm={handleDelete}
  on:cancel={() => {
    showDeleteDialog = false
    confirmDelete = null
  }}
/>
