<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { formatDate } from '$lib/i18n.svelte'
  import { cn } from '$lib/utils'

  interface AuditRow {
    id: string
    action: string
    entityType: string
    entityId: string
    userEmail: string | null
    metadata: string | null
    createdAt: string
  }

  const { data } = $props()
  const logs = (data.logs ?? []) as AuditRow[]
  const selectedAction = $derived(page.url.searchParams.get('action') ?? '')

  function handleFilter(action: string) {
    const params = new URLSearchParams()
    if (action) {params.set('action', action)}
    goto(`/admin/audit?${params}`, { keepFocus: true, noScroll: true })
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(page.url.searchParams)
    params.set('page', String(p))
    goto(`/admin/audit?${params}`, { keepFocus: true, noScroll: true })
  }

  function formatMetadata(meta: string | null) {
    if (!meta) {return null}
    try {
      const parsed = JSON.parse(meta)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return meta
    }
  }
</script>

<h1 class="text-2xl font-bold text-text-primary">Audit Log</h1>
<p class="mt-1 text-[14px] text-text-muted">Track all admin actions and system events.</p>

<!-- Action filter -->
<div class="mt-6 flex flex-wrap gap-2">
  <button
    class={cn(
      'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
      !selectedAction ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-surface hover:text-text-primary',
    )}
    onclick={() => handleFilter('')}
  >
    All Actions
  </button>
  {#each ['create', 'update', 'delete', 'login', 'logout'] as action}
    <button
      class={cn(
        'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
        selectedAction === action ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-surface hover:text-text-primary',
      )}
      onclick={() => handleFilter(action)}
    >
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </button>
  {/each}
</div>

<!-- Table -->
<div class="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
  {#if !data.logs.length}
    <div class="p-6 text-center">
      <p class="text-[13px] text-text-muted">No audit log entries found.</p>
    </div>
  {:else}
    <table class="w-full min-w-[700px]">
      <thead>
        <tr class="border-b border-border">
          <th class="px-5 py-3 text-start text-[12px] font-medium uppercase tracking-wider text-text-subtle">Action</th>
          <th class="px-5 py-3 text-start text-[12px] font-medium uppercase tracking-wider text-text-subtle">Entity</th>
          <th class="px-5 py-3 text-start text-[12px] font-medium uppercase tracking-wider text-text-subtle">Entity ID</th>
          <th class="px-5 py-3 text-start text-[12px] font-medium uppercase tracking-wider text-text-subtle">User</th>
          <th class="px-5 py-3 text-start text-[12px] font-medium uppercase tracking-wider text-text-subtle">Timestamp</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#each logs as log (log.id)}
          <tr class="transition-colors hover:bg-surface-deep/50">
            <td class="px-5 py-3.5">
              <span class={cn(
                'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                log.action === 'create' ? 'bg-success/15 text-success'
                : log.action === 'update' ? 'bg-info/15 text-info'
                : log.action === 'delete' ? 'bg-destructive/15 text-destructive'
                : log.action === 'login' ? 'bg-brand/15 text-brand'
                : log.action === 'logout' ? 'bg-warning/15 text-warning'
                : 'bg-muted text-text-muted',
              )}>
                {log.action}
              </span>
            </td>
            <td class="px-5 py-3.5 text-[13px] text-text-secondary">
              {log.entityType}
            </td>
            <td class="px-5 py-3.5">
              <code class="rounded bg-surface-deep px-1.5 py-0.5 text-[11px] text-text-subtle">
                {log.entityId.length > 8 ? log.entityId.slice(0, 8) + '...' : log.entityId}
              </code>
            </td>
            <td class="px-5 py-3.5 text-[13px] text-text-secondary">
              {log.userEmail ?? '—'}
            </td>
            <td class="px-5 py-3.5 text-[12px] text-text-subtle" title={formatDate(log.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}>
              {formatDate(log.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Pagination -->
    {#if data.totalPages > 1}
      <div class="flex items-center justify-between border-t border-border px-5 py-3">
        <p class="text-[12px] text-text-subtle">
          Page {data.page} of {data.totalPages}
        </p>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-surface disabled:opacity-40"
            disabled={data.page <= 1}
            onclick={() => goToPage(data.page - 1)}
          >
            Previous
          </button>
          <button
            class="rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-surface disabled:opacity-40"
            disabled={data.page >= data.totalPages}
            onclick={() => goToPage(data.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
