<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { createOrganizationSchema } from '$lib/validators/organization'

  interface OrgMembership {
    description: string | null
    id: string
    name: string
    ownerId: string
    role: string
    slug: string
  }

  let showCreateForm = $state(false)
  let createName = $state('')
  let createDescription = $state('')
  let creating = $state(false)
  let error = $state('')

  const queryClient = useQueryClient()

  const orgsQuery = createQuery(() => ({
    queryFn: async (): Promise<OrgMembership[]> => {
      const res = await fetch('/api/orgs')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      const data = (await res.json()) as { organizations: OrgMembership[] }
      return data.organizations
    },
    queryKey: ['organizations'],
  }))

  async function createOrg() {
    error = ''
    const parsed = createOrganizationSchema.safeParse({
      description: createDescription || undefined,
      name: createName,
    })
    if (!parsed.success) {
      error = parsed.error.issues[0]?.message ?? 'Invalid input'
      return
    }
    creating = true

    const res = await fetch('/api/orgs', {
      body: JSON.stringify(parsed.data),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      error = data.error?.message ?? 'Failed to create organization'
      creating = false
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    createName = ''
    createDescription = ''
    showCreateForm = false
    creating = false
  }

  function getRoleBadgeColor(role: string) {
    const colors: Record<string, string> = {
      admin: 'bg-info/20 text-info',
      member: 'bg-success/20 text-success',
      owner: 'bg-warning/20 text-warning',
      viewer: 'bg-muted/20 text-muted',
    }
    return colors[role] ?? 'bg-muted/20 text-muted'
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Organizations</h1>
      <p class="mt-1 text-sm text-text-muted">Manage your organizations and team memberships</p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
    >
      {showCreateForm ? 'Cancel' : 'New Organization'}
    </button>
  </div>

  {#if showCreateForm}
    <form
      class="rounded-lg border border-white/[0.06] bg-surface p-6"
      onsubmit={(e) => { e.preventDefault(); createOrg() }}
    >
      <h2 class="mb-4 text-lg font-semibold text-text-primary">Create Organization</h2>

      {#if error}
        <div class="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      {/if}

      <div class="space-y-4">
        <div>
          <label for="org-name" class="mb-1.5 block text-sm font-medium text-text-secondary">Name</label>
          <input
            id="org-name"
            bind:value={createName}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="My Organization"
            required
          />
        </div>
        <div>
          <label for="org-desc" class="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            id="org-desc"
            bind:value={createDescription}
            rows={3}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="What is this organization for?"
          ></textarea>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={creating || !createName.trim()}
            class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </div>
    </form>
  {/if}

  {#if orgsQuery.isPending}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="animate-pulse rounded-lg border border-white/[0.06] bg-surface p-6">
          <div class="h-5 w-48 rounded bg-white/[0.06]"></div>
          <div class="mt-3 h-4 w-72 rounded bg-white/[0.06]"></div>
        </div>
      {/each}
    </div>
  {:else if orgsQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load organizations
    </div>
  {:else if orgsQuery.data?.length === 0}
    <div class="rounded-lg border border-white/[0.06] bg-surface p-12 text-center">
      <p class="text-text-muted">No organizations yet</p>
      <p class="mt-2 text-sm text-text-subtle">Create your first organization to get started</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each orgsQuery.data ?? [] as org (org.id)}
        <a
          href="/app/organizations/{org.id}"
          class="block rounded-lg border border-white/[0.06] bg-surface p-6 transition-colors hover:border-white/[0.1] hover:bg-surface-deep"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-base font-semibold text-text-primary">{org.name}</h3>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-medium {getRoleBadgeColor(org.role)}">
                  {org.role}
                </span>
              </div>
              {#if org.description}
                <p class="mt-1.5 text-sm text-text-muted">{org.description}</p>
              {/if}
              <p class="mt-2 text-xs text-text-subtle">/{org.slug}</p>
            </div>
            <svg class="mt-1 shrink-0 text-text-subtle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
