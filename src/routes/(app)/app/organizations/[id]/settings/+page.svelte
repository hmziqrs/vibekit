<script lang="ts">
  import { page } from '$app/state'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'

  interface OrgDetail {
    membership: { id: string; joinedAt: string; role: string }
    organization: {
      createdAt: string
      description: string | null
      id: string
      name: string
      ownerId: string
      slug: string
      updatedAt: string
    }
  }

  let editName = $state('')
  let editDescription = $state('')
  let saving = $state(false)
  let saveError = $state('')
  let saveSuccess = $state(false)
  let deleteConfirm = $state(false)
  let deleting = $state(false)
  let deleteError = $state('')

  const orgId = $derived(page.params.id)
  const queryClient = useQueryClient()

  const orgQuery = createQuery(() => ({
    queryFn: async (): Promise<OrgDetail> => {
      const res = await fetch(`/api/orgs/${orgId}`)
      if (!res.ok) throw new Error('Failed to fetch organization')
      return (await res.json()) as OrgDetail
    },
    queryKey: ['organization', orgId],
  }))

  $effect(() => {
    if (orgQuery.data && !editName) {
      editName = orgQuery.data.organization.name
      editDescription = orgQuery.data.organization.description ?? ''
    }
  })

  async function saveSettings() {
    if (!editName.trim()) return
    saving = true
    saveError = ''
    saveSuccess = false

    const res = await fetch(`/api/orgs/${orgId}`, {
      body: JSON.stringify({
        description: editDescription || null,
        name: editName,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      saveError = data.error?.message ?? 'Failed to update organization'
      saving = false
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
    await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    saveSuccess = true
    saving = false
  }

  async function deleteOrg() {
    deleting = true
    deleteError = ''

    const res = await fetch(`/api/orgs/${orgId}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      deleteError = data.error?.message ?? 'Failed to delete organization'
      deleting = false
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    window.location.href = '/app/organizations'
  }
</script>

<div class="space-y-6">
  {#if orgQuery.isPending}
    <div class="animate-pulse space-y-4">
      <div class="h-8 w-48 rounded bg-white/[0.06]"></div>
      <div class="h-64 w-full rounded bg-white/[0.06]"></div>
    </div>
  {:else if orgQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load organization
    </div>
  {:else if orgQuery.data}
    {@const org = orgQuery.data.organization}

    <div>
      <div class="flex items-center gap-2 text-sm text-text-muted">
        <a href="/app/organizations" class="hover:text-text-primary">Organizations</a>
        <span>/</span>
        <a href="/app/organizations/{org.id}" class="hover:text-text-primary">{org.name}</a>
        <span>/</span>
        <span class="text-text-secondary">Settings</span>
      </div>
      <h1 class="mt-2 text-2xl font-bold text-text-primary">Organization Settings</h1>
    </div>

    <!-- General Settings -->
    <form
      class="rounded-lg border border-white/[0.06] bg-surface p-6"
      onsubmit={(e) => { e.preventDefault(); saveSettings() }}
    >
      <h2 class="mb-4 text-base font-semibold text-text-primary">General</h2>

      {#if saveError}
        <div class="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{saveError}</div>
      {/if}
      {#if saveSuccess}
        <div class="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">Settings saved</div>
      {/if}

      <div class="space-y-4">
        <div>
          <label for="edit-name" class="mb-1.5 block text-sm font-medium text-text-secondary">Organization Name</label>
          <input
            id="edit-name"
            bind:value={editName}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            required
          />
        </div>
        <div>
          <label for="edit-desc" class="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            id="edit-desc"
            bind:value={editDescription}
            rows={3}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="What is this organization for?"
          ></textarea>
        </div>
        <div>
          <span class="mb-1.5 block text-sm font-medium text-text-secondary">Slug</span>
          <p class="text-sm text-text-subtle">/{org.slug} (auto-generated from name)</p>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={saving || !editName.trim()}
            class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>

    <!-- Danger Zone -->
    <div class="rounded-lg border border-destructive/30 bg-surface p-6">
      <h2 class="mb-2 text-base font-semibold text-destructive">Danger Zone</h2>
      <p class="mb-4 text-sm text-text-muted">
        Once deleted, the organization and all its data will be permanently removed after 30 days.
      </p>

      {#if deleteError}
        <div class="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{deleteError}</div>
      {/if}

      {#if deleteConfirm}
        <div class="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p class="text-sm font-medium text-text-primary">
            Are you sure you want to delete <strong>{org.name}</strong>?
          </p>
          <div class="flex gap-2">
            <button
              onclick={deleteOrg}
              disabled={deleting}
              class="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete Organization'}
            </button>
            <button
              onclick={() => (deleteConfirm = false)}
              class="rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-white/[0.04]"
            >
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <button
          onclick={() => (deleteConfirm = true)}
          class="rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Delete Organization
        </button>
      {/if}
    </div>
  {/if}
</div>
