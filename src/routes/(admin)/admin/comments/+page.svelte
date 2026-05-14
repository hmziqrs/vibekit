<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import DataTable from '$lib/components/data-table.svelte'
  import { createQuery } from '@tanstack/svelte-query'

  interface CommentRow {
    authorEmail: string
    authorName: string
    content: string
    createdAt: Date
    id: string
    moderatedAt: Date | null
    postId: string
    postTitle: string | null
    spamReason: string | null
    spamScore: number | null
    status: string
  }

  let statusFilter = $state<string>('pending')
  let selectedIds = $state<Set<string>>(new Set())
  let deleteTarget = $state<CommentRow | null>(null)
  let showConfirmDialog = $state(false)
  let stats = $state({ approved: 0, pending: 0, rejected: 0, spam: 0 })

  const commentsQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/comments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      return (await res.json()) as { comments: CommentRow[]; page: number; total: number }
    },
    queryKey: ['admin', 'comments', { status: statusFilter }],
    retry: 1,
  }))

  const statsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/comments/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return (await res.json()) as typeof stats
    },
    queryKey: ['admin', 'comments', 'stats'],
    retry: 1,
  }))

  $effect(() => {
    if (statsQuery.data) stats = statsQuery.data
  })

  const columns = [
    { class: 'min-w-[150px]', key: 'authorName', label: 'Author', sortable: true },
    { class: 'min-w-[200px]', key: 'content', label: 'Content' },
    { class: 'min-w-[140px]', key: 'postTitle', label: 'Post' },
    { class: 'w-[100px]', key: 'status', label: 'Status', sortable: true },
    { class: 'w-[80px]', key: 'spamScore', label: 'Spam' },
    { class: 'w-[160px]', key: 'actions', label: '' },
  ]

  function statusColor(s: string): string {
    switch (s) {
      case 'approved': {
        return 'text-success bg-success/10'
      }
      case 'pending': {
        return 'text-warning bg-warning/10'
      }
      case 'rejected': {
        return 'text-destructive bg-destructive/10'
      }
      case 'spam': {
        return 'text-destructive bg-destructive/10'
      }
      default: {
        return 'text-text-muted bg-muted'
      }
    }
  }

  async function moderate(id: string, newStatus: 'approved' | 'rejected' | 'spam') {
    const res = await fetch(`/api/admin/comments/${id}/moderate`, {
      body: JSON.stringify({ status: newStatus }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    if (res.ok) {
      commentsQuery.refetch()
      statsQuery.refetch()
    }
  }

  async function deleteComment() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/comments/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      deleteTarget = null
      showConfirmDialog = false
      commentsQuery.refetch()
      statsQuery.refetch()
    }
  }

  async function bulkModerate(newStatus: 'approved' | 'rejected') {
    const promises = [...selectedIds].map((id) =>
      fetch(`/api/admin/comments/${id}/moderate`, {
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )
    await Promise.all(promises)
    selectedIds = new Set()
    commentsQuery.refetch()
    statsQuery.refetch()
  }

  function truncate(text: string, max = 80): string {
    return text.length > max ? `${text.slice(0, max)}...` : text
  }

  function handleSort(_key: string, _dir: 'asc' | 'desc') {
    // Server-side sorting handled by query
  }
</script>

<ConfirmDialog
  bind:open={showConfirmDialog}
  title="Delete Comment"
  message="Permanently delete this comment? This cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteComment}
/>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Comments</h1>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">
    Back to posts
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
    onclick={() => (statusFilter = 'spam')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'spam' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Spam</div>
    <div class="text-xl font-semibold text-destructive">{stats.spam}</div>
  </button>
  <button
    onclick={() => (statusFilter = 'approved')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'approved' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Approved</div>
    <div class="text-xl font-semibold text-success">{stats.approved}</div>
  </button>
  <button
    onclick={() => (statusFilter = 'rejected')}
    class="rounded-lg border border-border bg-surface p-3 text-left transition-colors {statusFilter === 'rejected' ? 'border-brand' : ''}"
  >
    <div class="text-[12px] text-text-muted">Rejected</div>
    <div class="text-xl font-semibold text-destructive">{stats.rejected}</div>
  </button>
</div>

<!-- Bulk actions -->
{#if selectedIds.size > 0}
  <div class="mt-4 flex items-center gap-3">
    <span class="text-[13px] text-text-muted">{selectedIds.size} selected</span>
    <button
      onclick={() => bulkModerate('approved')}
      class="rounded-lg bg-success/10 px-3 py-1 text-[12px] font-medium text-success hover:bg-success/20"
    >
      Approve
    </button>
    <button
      onclick={() => bulkModerate('rejected')}
      class="rounded-lg bg-destructive/10 px-3 py-1 text-[12px] font-medium text-destructive hover:bg-destructive/20"
    >
      Reject
    </button>
    <button
      onclick={() => (selectedIds = new Set())}
      class="text-[12px] text-text-muted hover:text-text-primary"
    >
      Clear
    </button>
  </div>
{/if}

<div class="mt-4">
  <DataTable
    {columns}
    rows={(commentsQuery.data?.comments ?? []) as unknown as Record<string, unknown>[]}
    loading={commentsQuery.isPending}
    {selectedIds}
    onSelectionChange={(ids) => (selectedIds = ids)}
    sortKey="createdAt"
    sortDir="desc"
    onSort={handleSort}
    error={commentsQuery.error ? 'Failed to load comments.' : ''}
    onRetry={() => commentsQuery.refetch()}
    emptyMessage="No comments matching this filter."
  >
    {#snippet children({ row: _row, columnKey })}
	      {@const row = _row as unknown as CommentRow}
      {#if columnKey === 'authorName'}
        <div>
          <span class="font-medium text-text-primary">{row.authorName}</span>
          <div class="text-[11px] text-text-faint">{row.authorEmail}</div>
        </div>
      {:else if columnKey === 'content'}
        <span class="line-clamp-2 text-text-muted">{truncate(row.content)}</span>
      {:else if columnKey === 'postTitle'}
        {#if row.postTitle}
          <a
            href="/admin/blog/{row.postId}/edit"
            class="text-text-muted hover:text-brand hover:underline"
          >
            {truncate(row.postTitle, 30)}
          </a>
        {:else}
          <span class="text-text-faint">—</span>
        {/if}
      {:else if columnKey === 'status'}
        <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium {statusColor(row.status)}">
          {row.status}
        </span>
      {:else if columnKey === 'spamScore'}
        <span class="text-text-muted">{row.spamScore ?? 0}</span>
      {:else if columnKey === 'actions'}
        <div class="flex items-center gap-1">
          {#if row.status !== 'approved'}
            <button
              class="rounded-lg px-2 py-1 text-[11px] font-medium text-success hover:bg-success/10"
              onclick={() => moderate(row.id, 'approved')}
            >
              Approve
            </button>
          {/if}
          {#if row.status !== 'rejected'}
            <button
              class="rounded-lg px-2 py-1 text-[11px] font-medium text-warning hover:bg-warning/10"
              onclick={() => moderate(row.id, 'rejected')}
            >
              Reject
            </button>
          {/if}
          <button
            class="rounded-lg px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
            onclick={() => {
              deleteTarget = row
              showConfirmDialog = true
            }}
          >
            Delete
          </button>
        </div>
      {/if}
    {/snippet}
  </DataTable>
</div>
