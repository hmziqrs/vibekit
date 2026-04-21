<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { updateItemSchema } from '$lib/validators/item'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  interface ItemData {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: string
    updatedAt: string
  }

  let itemId = $derived($page.params.id)
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
  let initialized = $state(false)

  $effect(() => {
    const item = itemQuery.data
    if (item && !initialized) {
      name = item.name
      description = item.description || ''
      initialized = true
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
        result.error.issues.map((i) => [i.path[0] as string, i.message])
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

        <!-- Name -->
        <div>
          <label for="edit-name" class="mb-1.5 block text-[13px] font-medium text-text-secondary">
            Name <span class="text-destructive">*</span>
          </label>
          <input
            id="edit-name"
            type="text"
            bind:value={name}
            maxlength={100}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand {errors.name ? 'border-destructive' : ''}"
            placeholder="Item name"
          />
          {#if errors.name}
            <p class="mt-1 text-[12px] text-destructive">{errors.name}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label
            for="edit-description"
            class="mb-1.5 block text-[13px] font-medium text-text-secondary"
          >
            Description
          </label>
          <textarea
            id="edit-description"
            bind:value={description}
            rows={4}
            maxlength={2000}
            class="w-full resize-none rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand {errors.description ? 'border-destructive' : ''}"
            placeholder="Optional description"
          ></textarea>
          {#if errors.description}
            <p class="mt-1 text-[12px] text-destructive">{errors.description}</p>
          {/if}
        </div>

        <!-- Status info -->
        {#if itemQuery.data}
          <div class="rounded-lg border border-white/[0.06] bg-surface-elevated p-3">
            <p class="text-[11px] uppercase tracking-wider text-text-subtle">Status</p>
            <span
              class="mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-medium {itemQuery.data.status ===
              'active'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'}"
            >
              {itemQuery.data.status}
            </span>
          </div>
        {/if}

        <!-- Actions -->
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
