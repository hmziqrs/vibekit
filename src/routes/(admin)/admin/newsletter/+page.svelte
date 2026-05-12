<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import DataTable from '$lib/components/data-table.svelte'
  import { createQuery } from '@tanstack/svelte-query'

  interface SubscriberRow {
    confirmedAt: Date | null
    createdAt: Date
    email: string
    id: string
    name: string | null
    source: string | null
    status: string
  }

  let statusFilter = $state<string>('confirmed')
  let selectedIds = $state<Set<string>>(new Set())
  let deleteTarget = $state<SubscriberRow | null>(null)
  let showConfirmDialog = $state(false)
  let stats = $state({ bounced: 0, confirmed: 0, pending: 0, unsubscribed: 0 })

  const subscribersQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/newsletter/subscribers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch subscribers')
      return (await res.json()) as { page: number; subscribers: SubscriberRow[]; total: number }
    },
    queryKey: ['admin', 'newsletter', 'subscribers', { status: statusFilter }],
    retry: 1,
  }))

  const statsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/newsletter/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return (await res.json()) as typeof stats
    },
    queryKey: ['admin', 'newsletter', 'stats'],
    retry: 1,
  }))

  $effect(() => {
    if (statsQuery.data) stats = statsQuery.data
  })

  const columns = [
    { class: 'min-w-[200px]', key: 'email', label: 'Email', sortable: true },
    { class: 'min-w-[120px]', key: 'name', label: 'Name' },
    { class: 'w-[100px]', key: 'status', label: 'Status', sortable: true },
    { class: 'w-[100px]', key: 'source', label: 'Source' },
    { class: 'min-w-[140px]', key: 'createdAt', label: 'Subscribed', sortable: true },
    { class: 'w-[80px]', key: 'actions', label: '' },
  ]

  function statusColor(s: string): string {
    switch (s) {
      case 'confirmed': {
        return 'text-green-400 bg-green-500/10'
      }
      case 'pending': {
        return 'text-yellow-400 bg-yellow-500/10'
      }
      case 'unsubscribed': {
        return 'text-text-muted bg-white/5'
      }
      case 'bounced': {
        return 'text-red-400 bg-red-500/10'
      }
      default: {
        return 'text-text-muted bg-white/5'
      }
    }
  }

  function formatDate(date: Date | null): string {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function deleteSubscriber() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/newsletter/subscribers/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      deleteTarget = null
      showConfirmDialog = false
      subscribersQuery.refetch()
      statsQuery.refetch()
    }
  }

  function handleSort(_key: string, _dir: 'asc' | 'desc') {
    // Server-side sorting handled by query
  }
</script>

<ConfirmDialog
  bind:open={showConfirmDialog}
  title="Delete Subscriber"
  message="Permanently delete this subscriber? This cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteSubscriber}
/>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Newsletter</h1>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">
    Back to blog
  </a>
</div>

<!-- Stats -->
<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
  <button
    onclick={() => (statusFilter = 'pending')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'pending' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Pending</div>
    <div class="text-xl font-semibold text-yellow-400">{stats.pending}</div>
  </button>
  <button
    onclick={() => (statusFilter = 'confirmed')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'confirmed' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Confirmed</div>
    <div class="text-xl font-semibold text-green-400">{stats.confirmed}</div>
  </button>
  <button
    onclick={() => (statusFilter = 'unsubscribed')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'unsubscribed' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Unsubscribed</div>
    <div class="text-xl font-semibold text-text-muted">{stats.unsubscribed}</div>
  </button>
  <button
    onclick={() => (statusFilter = 'bounced')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'bounced' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Bounced</div>
    <div class="text-xl font-semibold text-red-400">{stats.bounced}</div>
  </button>
</div>

<div class="mt-4">
  <DataTable
    {columns}
    rows={subscribersQuery.data?.subscribers ?? []}
    loading={subscribersQuery.isPending}
    {selectedIds}
    onSelectionChange={(ids) => (selectedIds = ids)}
    sortKey="createdAt"
    sortDir="desc"
    onSort={handleSort}
    error={subscribersQuery.error ? 'Failed to load subscribers.' : ''}
    onRetry={() => subscribersQuery.refetch()}
    emptyMessage="No subscribers matching this filter."
  >
    {#snippet children({ row, columnKey })}
      {#if columnKey === 'email'}
        <span class="font-medium text-text-primary">{row.email}</span>
      {:else if columnKey === 'name'}
        <span class="text-text-muted">{row.name ?? '—'}</span>
      {:else if columnKey === 'status'}
        <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium {statusColor(row.status)}">
          {row.status}
        </span>
      {:else if columnKey === 'source'}
        <span class="text-text-muted">{row.source ?? 'blog'}</span>
      {:else if columnKey === 'createdAt'}
        <span class="text-text-muted">{formatDate(row.createdAt)}</span>
      {:else if columnKey === 'actions'}
        <button
          class="rounded-lg px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/10"
          onclick={() => {
            deleteTarget = row as SubscriberRow
            showConfirmDialog = true
          }}
        >
          Delete
        </button>
      {/if}
    {/snippet}
  </DataTable>
</div>
