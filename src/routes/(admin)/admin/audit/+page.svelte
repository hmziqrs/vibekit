<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
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

  let { data } = $props()
  let selectedAction = $state(page.url.searchParams.get('action') ?? '')

  function handleFilter(action: string) {
    selectedAction = action
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    goto(`/admin/audit?${params}`, { keepFocus: true, noScroll: true })
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(page.url.searchParams)
    params.set('page', String(p))
    goto(`/admin/audit?${params}`, { keepFocus: true, noScroll: true })
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleString()
  }

  function formatMetadata(meta: string | null) {
    if (!meta) return null
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
      !selectedAction ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
    )}
    onclick={() => handleFilter('')}
  >
    All Actions
  </button>
  {#each ['create', 'update', 'delete', 'login', 'logout'] as action}
    <button
      class={cn(
        'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
        selectedAction === action ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
      )}
      onclick={() => handleFilter(action)}
    >
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </button>
  {/each}
</div>

<!-- Table -->
<div class="mt-6 overflow-x-auto rounded-xl border border-white/[0.06] bg-surface">
  {#if !data.logs.length}
    <div class="p-6 text-center">
      <p class="text-[13px] text-text-muted">No audit log entries found.</p>
    </div>
  {:else}
    <table class="w-full min-w-[700px]">
      <thead>
        <tr class="border-b border-white/[0.06]">
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Action</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Entity</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Entity ID</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">User</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Timestamp</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/[0.04]">
        {#each data.logs as log (log.id)}
          <tr class="transition-colors hover:bg-white/[0.02]">
            <td class="px-5 py-3.5">
              <span class={cn(
                'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                log.action === 'create' ? 'bg-green-500/15 text-green-400'
                : log.action === 'update' ? 'bg-blue-500/15 text-blue-400'
                : log.action === 'delete' ? 'bg-red-500/15 text-red-400'
                : log.action === 'login' ? 'bg-purple-500/15 text-purple-400'
                : log.action === 'logout' ? 'bg-yellow-500/15 text-yellow-400'
                : 'bg-white/[0.06] text-text-muted',
              )}>
                {log.action}
              </span>
            </td>
            <td class="px-5 py-3.5 text-[13px] text-text-secondary">
              {log.entityType}
            </td>
            <td class="px-5 py-3.5">
              <code class="rounded bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-text-subtle">
                {log.entityId.length > 8 ? log.entityId.slice(0, 8) + '...' : log.entityId}
              </code>
            </td>
            <td class="px-5 py-3.5 text-[13px] text-text-secondary">
              {log.userEmail ?? '—'}
            </td>
            <td class="px-5 py-3.5 text-[12px] text-text-subtle" title={formatDate(log.createdAt)}>
              {formatDate(log.createdAt)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Pagination -->
    {#if data.totalPages > 1}
      <div class="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <p class="text-[12px] text-text-subtle">
          Page {data.page} of {data.totalPages}
        </p>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            disabled={data.page <= 1}
            onclick={() => goToPage(data.page - 1)}
          >
            Previous
          </button>
          <button
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
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
