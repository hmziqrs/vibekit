<script lang="ts">
  import { createMutation, createQuery } from '@tanstack/svelte-query'

  const integrationsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/integrations')
      if (!res.ok) throw new Error('Failed to fetch')
      return (await res.json()) as {
        integrations: {
          createdAt: string
          id: string
          lastError: string | null
          lastSyncedAt: string | null
          organizationId: string | null
          provider: string
          scopes: string[]
          status: string
          userId: string | null
        }[]
      }
    },
    queryKey: ['admin-integrations'],
  }))

  const healthMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/integrations/${id}/health`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      return await res.json()
    },
    onSuccess: () => integrationsQuery.refetch(),
  }))

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString()
  }

  const statusColors: Record<string, string> = {
    active: 'bg-success/15 text-success',
    disconnected: 'bg-muted text-text-muted',
    error: 'bg-destructive/15 text-destructive',
    expired: 'bg-warning/15 text-warning',
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-xl font-semibold text-text-primary">Integrations</h1>
    <p class="mt-1 text-sm text-text-muted">Monitor third-party integration connections across the platform</p>
  </div>

  {#if integrationsQuery.isSuccess && integrationsQuery.data}
    {#if integrationsQuery.data.integrations.length === 0}
      <div class="rounded-lg border border-border bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No integrations found</p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-lg border border-border">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-surface-deep">
              <th class="px-4 py-3 text-left font-medium text-text-muted">Provider</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Owner</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Scopes</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Last Sync</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Created</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each integrationsQuery.data.integrations as int (int.id)}
              <tr class="bg-surface hover:bg-surface-deep/50">
                <td class="px-4 py-3 capitalize text-text-primary">{int.provider}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColors[
                      int.status
                    ] ?? 'bg-muted text-text-muted'}"
                  >
                    {int.status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-text-subtle">
                    {int.organizationId ? `Org: ${int.organizationId.slice(0, 8)}...` : `User: ${(int.userId ?? '').slice(0, 8)}...`}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-text-secondary">
                  {int.scopes.join(', ') || '-'}
                </td>
                <td class="px-4 py-3 text-text-secondary">
                  {int.lastSyncedAt ? formatDate(int.lastSyncedAt) : '-'}
                </td>
                <td class="px-4 py-3 text-text-secondary">
                  {formatDate(int.createdAt)}
                </td>
                <td class="px-4 py-3">
                  <button
                    onclick={() => healthMutation.mutate(int.id)}
                    disabled={healthMutation.isPending}
                    class="rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                  >
                    Health
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
