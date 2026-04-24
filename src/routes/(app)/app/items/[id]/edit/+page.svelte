<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FormField from '$lib/components/form-field.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { updateItemSchema } from '$lib/validators/item'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import type { ItemData } from '$lib/types'

  let itemId = $derived(page.params.id ?? '')
  const queryClient = useQueryClient()

  const itemQuery = createQuery(() => ({
    queryKey: ['item', itemId],
    queryFn: async (): Promise<ItemData> => {
      const res = await fetch(`/api/items/${itemId}`)
      if (!res.ok) throw new Error('Item not found')
      const data = (await res.json()) as { item: ItemData }
      return data.item
    },
  }))

  let name = $state('')
  let description = $state('')
  let errors = $state<Record<string, string>>({})
  let loading = $state(false)
  let serverError = $state('')
  let lastItemId = $state('')

  // Sync form state from query data when item changes.
  // This effect is the standard pattern for initializing editable
  // local state from external async data (TanStack Query).
  $effect(() => {
    const item = itemQuery.data
    if (item && itemId !== lastItemId) {
      name = item.name
      description = item.description || ''
      lastItemId = itemId
    }
  })

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = updateItemSchema.safeParse({
      name,
      description: description.trim() || undefined,
    })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    loading = true
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        serverError = body.error || 'Failed to update item'
        loading = false
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['items'] })
      goto('/app/items')
    } catch {
      serverError = 'Something went wrong'
      loading = false
    }
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Edit Item</h1>
  <p class="mt-1 text-[14px] text-text-muted">Update the details of your item.</p>

  {#if itemQuery.isLoading}
    <div class="mt-6 rounded-xl border border-white/[0.06] bg-surface p-6">
      <div class="space-y-4">
        <div class="h-4 w-24 animate-pulse rounded bg-white/[0.04]"></div>
        <div class="h-10 animate-pulse rounded-lg bg-white/[0.04]"></div>
        <div class="h-4 w-28 animate-pulse rounded bg-white/[0.04]"></div>
        <div class="h-24 animate-pulse rounded-lg bg-white/[0.04]"></div>
      </div>
    </div>
  {:else if itemQuery.error}
    <div class="mt-6 rounded-xl border border-destructive/20 bg-surface p-6 text-center">
      <p class="text-[14px] text-destructive">
        {itemQuery.error.message || 'Failed to load item'}
      </p>
      <a
        href="/app/items"
        class="mt-2 inline-block text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Back to Items
      </a>
    </div>
  {:else}
    <div class="mt-6 rounded-xl border border-white/[0.06] bg-surface p-6">
      <form onsubmit={handleSubmit} class="space-y-5">
        {#if serverError}
          <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p class="text-[13px] text-destructive">{serverError}</p>
          </div>
        {/if}

        <FormField
          id="edit-name"
          label="Name"
          bind:value={name}
          error={errors.name}
          required={true}
          maxlength={100}
          placeholder="Item name"
        />

        <FormField
          id="edit-description"
          label="Description"
          type="textarea"
          bind:value={description}
          error={errors.description}
          rows={4}
          maxlength={2000}
          placeholder="Optional description"
        />

        {#if itemQuery.data}
          <div class="rounded-lg border border-white/[0.06] bg-surface-elevated p-3">
            <p class="text-[11px] uppercase tracking-wider text-text-subtle">Status</p>
            <div class="mt-1">
              <StatusBadge status={itemQuery.data.status} />
            </div>
          </div>
        {/if}

        <div class="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <a
            href="/app/items"
            class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  {/if}
</div>
