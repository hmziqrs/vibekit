<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  interface WebhookEndpoint {
    active: boolean
    createdAt: string
    description: string | null
    events: string[]
    id: string
    secret: string
    updatedAt: string
    url: string
  }

  interface Delivery {
    attemptCount: number
    createdAt: string
    endpointId: string
    eventType: string
    id: string
    nextRetryAt: string | null
    responseBody: string | null
    statusCode: number | null
    status: string
  }

  const EVENT_GROUPS = [
    {
      events: ['blog.create', 'blog.update', 'blog.delete', 'blog.publish', 'blog.unpublish', 'blog.archive', 'blog.restore'],
      label: 'Blog',
    },
    {
      events: ['item.create', 'item.update', 'item.delete'],
      label: 'Items',
    },
    {
      events: ['comment.create', 'comment.delete', 'comment.moderate'],
      label: 'Comments',
    },
    {
      events: ['organization.create', 'organization.update', 'organization.delete', 'organization.invite'],
      label: 'Organizations',
    },
    {
      events: ['team.create', 'team.update', 'team.delete'],
      label: 'Teams',
    },
    {
      events: ['user.update', 'user.ban', 'user.unban'],
      label: 'Users',
    },
    {
      events: ['api_key.created', 'api_key.updated', 'api_key.rotated', 'api_key.revoked'],
      label: 'API Keys',
    },
    {
      events: ['announcement.create', 'announcement.update', 'announcement.delete'],
      label: 'Announcements',
    },
  ]

  let showCreateForm = $state(false)
  let newUrl = $state('')
  let newDescription = $state('')
  let selectedEvents = $state<string[]>([])
  let newEndpointResult = $state<{ id: string; secret: string } | null>(null)
  let selectedEndpointId = $state<string | null>(null)
  let error = $state('')
  let testLoading = $state(false)

  const endpointsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/webhooks')
      if (!res.ok) throw new Error('Failed to fetch webhooks')
      return (await res.json()) as { endpoints: WebhookEndpoint[] }
    },
    queryKey: ['webhooks'],
    retry: 1,
  }))

  const deliveriesQuery = createQuery(() => ({
    enabled: Boolean(selectedEndpointId),
    queryFn: async () => {
      const res = await fetch(`/api/webhooks/${selectedEndpointId}/deliveries`)
      if (!res.ok) throw new Error('Failed to fetch deliveries')
      return (await res.json()) as { deliveries: Delivery[] }
    },
    queryKey: ['webhooks', selectedEndpointId, 'deliveries'],
    retry: 1,
  }))

  function toggleEvent(event: string) {
    selectedEvents = selectedEvents.includes(event)
      ? selectedEvents.filter((e) => e !== event)
      : [...selectedEvents, event]
  }

  function toggleGroup(events: string[]) {
    const allSelected = events.every((e) => selectedEvents.includes(e))
    selectedEvents = allSelected
      ? selectedEvents.filter((e) => !events.includes(e))
      : [...new Set([...selectedEvents, ...events])]
  }

  function selectAll() {
    selectedEvents = EVENT_GROUPS.flatMap((g) => g.events)
  }

  function clearAll() {
    selectedEvents = []
  }

  async function createEndpoint() {
    error = ''
    if (!newUrl || selectedEvents.length === 0) {
      error = 'URL and at least one event type are required'
      return
    }
    try {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          description: newDescription || undefined,
          events: selectedEvents,
          url: newUrl,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        error = body.error ?? 'Failed to create webhook'
        return
      }
      const result = (await res.json()) as { id: string; secret: string }
      newEndpointResult = result
      newUrl = ''
      newDescription = ''
      selectedEvents = []
      showCreateForm = false
      endpointsQuery.refetch()
    } catch {
      error = 'Network error'
    }
  }

  async function deleteEndpoint(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    if (selectedEndpointId === id) selectedEndpointId = null
    endpointsQuery.refetch()
  }

  async function testEndpoint(id: string) {
    testLoading = true
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
      const result = (await res.json()) as { status: string }
      alert(`Test delivery: ${result.status}`)
    } catch {
      alert('Test failed')
    }
    testLoading = false
  }

  function formatDate(date: string | null): string {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'success': { return 'text-success bg-success/10'
      }
      case 'failed': { return 'text-destructive bg-destructive/10'
      }
      case 'pending': { return 'text-warning bg-warning/10'
      }
      case 'retrying': { return 'text-info bg-info/10'
      }
      default: { return 'text-text-muted bg-white/5'
      }
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Webhooks</h1>
      <p class="mt-1 text-[14px] text-text-muted">
        Configure outbound webhooks to receive real-time event notifications.
      </p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-brand-foreground hover:bg-brand-hover"
    >
      {showCreateForm ? 'Cancel' : 'Add Endpoint'}
    </button>
  </div>

  {#if newEndpointResult}
    <div class="rounded-xl border border-success/20 bg-success/5 p-4">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="font-medium text-success">Webhook Endpoint Created</h3>
          <p class="mt-1 text-[13px] text-text-muted">
            Save this secret now — it won't be shown again.
          </p>
          <code class="mt-2 block rounded bg-surface-deep px-3 py-2 text-[13px] text-success font-mono break-all">
            {newEndpointResult.secret}
          </code>
        </div>
        <button
          onclick={() => (newEndpointResult = null)}
          class="text-text-muted hover:text-text-secondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
      <p class="text-[14px] text-destructive">{error}</p>
    </div>
  {/if}

  {#if showCreateForm}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-5">
      <h3 class="text-[15px] font-medium text-text-primary">New Webhook Endpoint</h3>

      <div class="mt-4 space-y-4">
        <div>
          <label for="webhook-url" class="mb-1.5 block text-[13px] font-medium text-text-secondary">Payload URL</label>
          <input
            id="webhook-url"
            type="url"
            bind:value={newUrl}
            placeholder="https://example.com/webhooks"
            class="w-full rounded-lg border border-white/[0.06] bg-surface-deep px-3 py-2 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label for="webhook-description" class="mb-1.5 block text-[13px] font-medium text-text-secondary">Description</label>
          <input
            id="webhook-description"
            type="text"
            bind:value={newDescription}
            placeholder="Optional description"
            class="w-full rounded-lg border border-white/[0.06] bg-surface-deep px-3 py-2 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>

        <div aria-labelledby="webhook-events-label">
          <div class="mb-2 flex items-center justify-between">
            <span id="webhook-events-label" class="text-[13px] font-medium text-text-secondary">Events</span>
            <div class="flex gap-2">
              <button
                onclick={selectAll}
                class="text-[12px] text-brand hover:text-brand-hover"
              >
                Select all
              </button>
              <button
                onclick={clearAll}
                class="text-[12px] text-text-muted hover:text-text-secondary"
              >
                Clear
              </button>
            </div>
          </div>

          <div class="space-y-3">
            {#each EVENT_GROUPS as group}
              <div>
                <button
                  onclick={() => toggleGroup(group.events)}
                  class="flex items-center gap-2 text-[13px] font-medium text-text-secondary"
                >
                  <span class="flex h-4 w-4 items-center justify-center rounded border border-white/10 bg-surface-deep text-[10px]">
                    {#if group.events.every((e) => selectedEvents.includes(e))}
                      ✓
                    {/if}
                  </span>
                  {group.label}
                </button>
                <div class="mt-1.5 flex flex-wrap gap-1.5 pl-6">
                  {#each group.events as event}
                    <button
                      onclick={() => toggleEvent(event)}
                      class="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors {
                        selectedEvents.includes(event)
                          ? 'bg-brand/20 text-brand'
                          : 'bg-white/5 text-text-muted hover:bg-white/10'
                      }"
                    >
                      {event.split('.').pop()}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}

            <button
              onclick={() => toggleEvent('*')}
              class="flex items-center gap-2 text-[13px] font-medium text-text-secondary"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded border border-white/10 bg-surface-deep text-[10px]">
                {#if selectedEvents.includes('*')}✓{/if}
              </span>
              <span class="text-brand">All Events (wildcard)</span>
            </button>
          </div>
        </div>

        <button
          onclick={createEndpoint}
          disabled={!newUrl || selectedEvents.length === 0}
          class="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
        >
          Create Endpoint
        </button>
      </div>
    </div>
  {/if}

  {#if endpointsQuery.isPending}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if endpointsQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load webhook endpoints.</p>
      <button
        onclick={() => endpointsQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if endpointsQuery.data?.endpoints.length === 0}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-8 text-center">
      <p class="text-text-muted">No webhook endpoints configured yet.</p>
    </div>
  {:else if endpointsQuery.data}
    <div class="space-y-3">
      {#each endpointsQuery.data.endpoints as endpoint}
        <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate text-[14px] font-medium text-text-primary">{endpoint.url}</span>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-medium {
                  endpoint.active
                    ? 'bg-success/10 text-success'
                    : 'bg-white/5 text-text-muted'
                }">
                  {endpoint.active ? 'Active' : 'Paused'}
                </span>
              </div>
              {#if endpoint.description}
                <p class="mt-0.5 text-[13px] text-text-muted">{endpoint.description}</p>
              {/if}
              <div class="mt-2 flex flex-wrap gap-1">
                {#each endpoint.events.slice(0, 5) as event}
                  <span class="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-text-muted">
                    {event}
                  </span>
                {/each}
                {#if endpoint.events.length > 5}
                  <span class="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-text-muted">
                    +{endpoint.events.length - 5} more
                  </span>
                {/if}
              </div>
              <p class="mt-1.5 text-[12px] text-text-faint">
                Created {formatDate(endpoint.createdAt)}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => testEndpoint(endpoint.id)}
                disabled={testLoading}
                class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-secondary hover:bg-white/5"
              >
                Test
              </button>
              <button
                onclick={() => (selectedEndpointId = selectedEndpointId === endpoint.id ? null : endpoint.id)}
                class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-secondary hover:bg-white/5"
              >
                Deliveries
              </button>
              <button
                onclick={() => deleteEndpoint(endpoint.id)}
                class="rounded-lg border border-destructive/20 px-3 py-1.5 text-[12px] text-destructive hover:bg-destructive/5"
              >
                Delete
              </button>
            </div>
          </div>

          {#if selectedEndpointId === endpoint.id}
            <div class="mt-4 border-t border-white/[0.06] pt-4">
              <h4 class="mb-2 text-[13px] font-medium text-text-secondary">Delivery History</h4>
              {#if deliveriesQuery.isPending}
                <div class="space-y-2">
                  {#each Array(2) as _}
                    <div class="h-8 animate-pulse rounded-lg bg-white/[0.04]"></div>
                  {/each}
                </div>
              {:else if deliveriesQuery.error}
                <div class="rounded-lg border border-destructive/20 bg-surface p-4 text-center">
                  <p class="text-[13px] text-destructive">Failed to load deliveries.</p>
                  <button
                    onclick={() => deliveriesQuery.refetch()}
                    class="mt-1 text-[12px] font-medium text-brand transition-colors hover:text-brand-hover"
                  >
                    Try again
                  </button>
                </div>
              {:else if deliveriesQuery.data?.deliveries.length === 0}
                <p class="text-[13px] text-text-muted">No deliveries yet.</p>
              {:else if deliveriesQuery.data}
                <div class="space-y-2">
                  {#each deliveriesQuery.data.deliveries as delivery}
                    <div class="flex items-center gap-3 rounded-lg bg-surface-deep px-3 py-2">
                      <span class="rounded-full px-2 py-0.5 text-[11px] font-medium {statusColor(delivery.status)}">
                        {delivery.status}
                      </span>
                      <span class="text-[13px] text-text-primary">{delivery.eventType}</span>
                      {#if delivery.statusCode}
                        <span class="text-[12px] text-text-muted">{delivery.statusCode}</span>
                      {/if}
                      <span class="ml-auto text-[12px] text-text-faint">
                        {formatDate(delivery.createdAt)} · {delivery.attemptCount} attempt(s)
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
