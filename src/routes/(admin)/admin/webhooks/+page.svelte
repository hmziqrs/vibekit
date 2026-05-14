<script lang="ts">
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import { page } from '$app/state'

  const { isSuccess, isPending, error, data, refetch } = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if ($state.snapshot(statusFilter)) params.set('status', statusFilter)
      if ($state.snapshot(eventTypeFilter)) params.set('eventType', eventTypeFilter)
      const res = await fetch(`/api/admin/webhooks/deliveries?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch deliveries')
      return (await res.json()) as {
        deliveries: {
          attemptCount: number
          createdAt: string
          endpointId: string
          eventType: string
          id: string
          nextRetryAt: string | null
          responseBody: string | null
          statusCode: number | null
          status: string
        }[]
      }
    },
    queryKey: ['admin-webhook-deliveries'],
  }))

  let statusFilter = $state('')
  let eventTypeFilter = $state('')

  const retryMutation = createMutation(() => ({
    mutationFn: async (deliveryId: string) => {
      const res = await fetch(`/api/admin/webhooks/${deliveryId}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error('Retry failed')
      return await res.json()
    },
    onSuccess: () => refetch(),
  }))

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString()
  }

  const statusColors: Record<string, string> = {
    failed: 'bg-destructive/15 text-destructive',
    pending: 'bg-warning/15 text-warning',
    retrying: 'bg-warning/15 text-warning',
    success: 'bg-success/15 text-success',
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold text-text-primary">Webhook Deliveries</h1>
      <p class="mt-1 text-sm text-text-muted">Monitor all webhook delivery attempts across the platform</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-3">
    <select
      aria-label="Filter by delivery status"
      bind:value={statusFilter}
      class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
      onchange={() => refetch()}
    >
      <option value="">All Statuses</option>
      <option value="success">Success</option>
      <option value="failed">Failed</option>
      <option value="retrying">Retrying</option>
      <option value="pending">Pending</option>
    </select>

    <input
      type="text"
      placeholder="Filter by event type..."
      bind:value={eventTypeFilter}
      class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
      onkeydown={(e) => e.key === 'Enter' && refetch()}
    />

    <button
      onclick={() => refetch()}
      class="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
    >
      Refresh
    </button>
  </div>

  {#if retryMutation.isError}
    <p class="rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{retryMutation.error?.message ?? 'Retry failed'}</p>
  {/if}

  {#if isPending}
    <div class="flex items-center justify-center py-12">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load webhook deliveries.</p>
      <button
        onclick={() => refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if isSuccess && data}
    {#if data.deliveries.length === 0}
      <div class="rounded-lg border border-border bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No webhook deliveries found</p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-lg border border-border">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-surface-deep">
              <th class="px-4 py-3 text-left font-medium text-text-muted">Event</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">HTTP Code</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Attempts</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Next Retry</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Created</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each data.deliveries as delivery (delivery.id)}
              <tr class="bg-surface hover:bg-surface-deep/50">
                <td class="px-4 py-3">
                  <code class="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-text-secondary"
                    >{delivery.eventType}</code
                  >
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColors[delivery.status] ?? 'bg-white/[0.06] text-text-muted'}"
                  >
                    {delivery.status}
                  </span>
                </td>
                <td class="px-4 py-3 text-text-secondary">
                  {delivery.statusCode ?? '-'}
                </td>
                <td class="px-4 py-3 text-text-secondary">
                  {delivery.attemptCount}
                </td>
                <td class="px-4 py-3 text-text-secondary">
                  {delivery.nextRetryAt ? formatDate(delivery.nextRetryAt) : '-'}
                </td>
                <td class="px-4 py-3 text-text-secondary">
                  {formatDate(delivery.createdAt)}
                </td>
                <td class="px-4 py-3">
                  {#if delivery.status !== 'success'}
                    <button
                      onclick={() => retryMutation.mutate(delivery.id)}
                      disabled={retryMutation.isPending}
                      class="rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
