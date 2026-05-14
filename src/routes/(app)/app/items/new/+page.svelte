<script lang="ts">
  import { goto } from '$app/navigation'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'
  import { createItemSchema } from '$lib/validators/item'

  interface FormInput { description: string; name: string }

  const form = createForm(() => ({
    defaultValues: {
      description: '',
      name: '',
    },
    onSubmit: async ({ value }: { value: FormInput }) => {
      try {
        const payload = {
          description: value.description.trim() || undefined,
          name: value.name,
        }
        const res = await fetch('/api/items', {
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return {
            form: body.error || 'Failed to create item',
          }
        }
        goto('/app/items')
        return null
      } catch (error) {
        return {
          form: error instanceof Error ? error.message : 'Something went wrong',
        }
      }
    },
    validators: {
      onSubmit: createItemSchema as never,
    },
  }))
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Create Item</h1>
  <p class="mt-1 text-[14px] text-text-muted">Add a new item to your collection.</p>

  <div class="mt-6 rounded-xl border border-white/[0.06] bg-surface p-6">
    <form onsubmit={form.handleSubmit} class="space-y-5" novalidate>
      <form.Field name="name">
        {#snippet children(field)}
          <TanstackField
            field={field as never}
            label="Name"
            placeholder="Item name"
          />
        {/snippet}
      </form.Field>

      <form.Field name="description">
        {#snippet children(field)}
          <TanstackField
            field={field as never}
            label="Description"
            type="textarea"
            rows={4}
            placeholder="Optional description"
          />
        {/snippet}
      </form.Field>

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
              {isSubmitting ? 'Creating...' : 'Create Item'}
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
</div>
