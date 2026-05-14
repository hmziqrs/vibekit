<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import TanstackField from '$lib/components/tanstack-field.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { updateItemSchema, type UpdateItemInput } from '$lib/validators/item'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { createForm } from '@tanstack/svelte-form'
  import type { ItemData } from '$lib/types'
  import { extractFormError } from '$lib/form-utils'

  const itemId = $derived(page.params.id ?? '')
  const queryClient = useQueryClient()

  const itemQuery = createQuery(() => ({
    queryFn: async (): Promise<ItemData> => {
      const res = await fetch(`/api/items/${itemId}`)
      if (!res.ok) throw new Error('Item not found')
      const data = (await res.json()) as { item: ItemData }
      return data.item
    },
    queryKey: ['item', itemId],
  }))

  let lastItemId = $state('')
  interface FormInput { description: string; name: string }

  const form = createForm(() => ({
    defaultValues: {
      description: itemQuery.data?.description ?? '',
      name: itemQuery.data?.name ?? '',
    },
    onSubmit: async ({ value }: { value: FormInput }) => {
      try {
        const res = await fetch(`/api/items/${itemId}`, {
          body: JSON.stringify(value),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { form: body.error || 'Failed to update item' }
        }
        await queryClient.invalidateQueries({ queryKey: ['items'] })
        goto('/app/items')
        return null
      } catch (error) {
        return { form: error instanceof Error ? error.message : 'Something went wrong' }
      }
    },
    validators: {
      onSubmit: updateItemSchema as never,
    },
  }))

  $effect(() => {
    const item = itemQuery.data
    if (item && itemId !== lastItemId) {
      lastItemId = itemId
      form.setFieldValue('name', item.name)
      form.setFieldValue('description', item.description || '')
    }
  })
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Edit Item</h1>
  <p class="mt-1 text-[14px] text-text-muted">Update the details of your item.</p>

  {#if itemQuery.isPending}
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
      <form onsubmit={form.handleSubmit} class="space-y-5" novalidate>
        <form.Field name="name">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Name"
              placeholder="Item name"
            />
          {/snippet}
        </form.Field>

        <form.Field name="description">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Description"
              type="textarea"
              rows={4}
              placeholder="Optional description"
            />
          {/snippet}
        </form.Field>

        {#if itemQuery.data}
          <div class="rounded-lg border border-white/[0.06] bg-surface-elevated p-3">
            <p class="text-[11px] uppercase tracking-wider text-text-subtle">Status</p>
            <div class="mt-1">
              <StatusBadge status={itemQuery.data.status} />
            </div>
          </div>
        {/if}

        <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
          {#snippet children(errorMessage)}
            {#if errorMessage}
              <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p class="text-[13px] text-destructive">{errorMessage}</p>
              </div>
            {/if}
          {/snippet}
        </form.Subscribe>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {#snippet children(isSubmitting)}
            <div class="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <a
                href="/app/items"
                class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
              >
                Cancel
              </a>
            </div>
          {/snippet}
        </form.Subscribe>
      </form>
    </div>
  {/if}
</div>
