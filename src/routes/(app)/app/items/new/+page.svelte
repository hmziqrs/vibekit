<script lang="ts">
  import { goto } from '$app/navigation'
  import FormField from '$lib/components/form-field.svelte'
  import { createItemSchema } from '$lib/validators/item'

  let name = $state('')
  let description = $state('')
  let errors = $state<Record<string, string>>({})
  let loading = $state(false)
  let serverError = $state('')

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = createItemSchema.safeParse({
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
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        serverError = body.error || 'Failed to create item'
        loading = false
        return
      }
      goto('/app/items')
    } catch {
      serverError = 'Something went wrong'
      loading = false
    }
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Create Item</h1>
  <p class="mt-1 text-[14px] text-text-muted">Add a new item to your collection.</p>

  <div class="mt-6 rounded-xl border border-white/[0.06] bg-surface p-6">
    <form onsubmit={handleSubmit} class="space-y-5">
      {#if serverError}
        <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p class="text-[13px] text-destructive">{serverError}</p>
        </div>
      {/if}

      <FormField
        id="item-name"
        label="Name"
        bind:value={name}
        error={errors.name}
        required={true}
        maxlength={100}
        placeholder="Item name"
      />

      <FormField
        id="item-description"
        label="Description"
        type="textarea"
        bind:value={description}
        error={errors.description}
        rows={4}
        maxlength={2000}
        placeholder="Optional description"
      />

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Item'}
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
</div>
