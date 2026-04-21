<script lang="ts">
  import { createItemSchema } from '$lib/validators/item'
  import { goto } from '$app/navigation'

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
        result.error.issues.map((i) => [i.path[0] as string, i.message])
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

      <!-- Name -->
      <div>
        <label for="item-name" class="mb-1.5 block text-[13px] font-medium text-text-secondary">
          Name <span class="text-destructive">*</span>
        </label>
        <input
          id="item-name"
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
          for="item-description"
          class="mb-1.5 block text-[13px] font-medium text-text-secondary"
        >
          Description
        </label>
        <textarea
          id="item-description"
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

      <!-- Actions -->
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
