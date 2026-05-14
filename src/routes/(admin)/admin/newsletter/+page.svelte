<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import DataTable from '$lib/components/data-table.svelte'
  import { formatDate } from '$lib/i18n.svelte'
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
  let mutationError = $state('')

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
        return 'text-success bg-success/10'
      }
      case 'pending': {
        return 'text-warning bg-warning/10'
      }
      case 'unsubscribed': {
        return 'text-text-muted bg-muted'
      }
      case 'bounced': {
        return 'text-destructive bg-destructive/10'
      }
      default: {
        return 'text-text-muted bg-muted'
      }
    }
  }

  async function deleteSubscriber() {
    if (!deleteTarget) return
    try {
      mutationError = ''
      const res = await fetch(`/api/admin/newsletter/subscribers/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        deleteTarget = null
        showConfirmDialog = false
        subscribersQuery.refetch()
        statsQuery.refetch()
      } else {
        mutationError = 'Failed to delete subscriber. Please try again.'
      }
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to delete subscriber.'
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

{#if mutationError}
  <p class="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
{/if}

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
    <div class="text-xl font-semibold text-warning">{stats.pending}</div>
  </button>
  <button
    onclick={() => (statusFilter = 'confirmed')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'confirmed' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Confirmed</div>
    <div class="text-xl font-semibold text-success">{stats.confirmed}</div>
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
    <div class="text-xl font-semibold text-destructive">{stats.bounced}</div>
  </button>
</div>

<div class="mt-4">
  <DataTable
    {columns}
    rows={(subscribersQuery.data?.subscribers ?? []) as unknown as Record<string, unknown>[]}
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
    {#snippet children({ row: _row, columnKey })}
      {@const row = _row as unknown as SubscriberRow}
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
        <span class="text-text-muted">{row.createdAt ? formatDate(row.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
      {:else if columnKey === 'actions'}
        <button
          class="rounded-lg px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
          onclick={() => {
            deleteTarget = row
            showConfirmDialog = true
          }}
        >
          Delete
        </button>
      {/if}
    {/snippet}
  </DataTable>
</div>
