<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { hasTeamPermission, type OrgRole, type TeamRole } from '$lib/permissions'
  import { createTeamSchema } from '$lib/validators/team'

  interface Team {
    createdAt: string
    description: string | null
    id: string
    name: string
    updatedAt: string
  }

  interface OrgData {
    membership: { id: string; joinedAt: string; role: OrgRole }
    organization: { id: string; name: string; description: string | null; slug: string }
  }

  let showCreateForm = $state(false)
  let createName = $state('')
  let createDescription = $state('')
  let creating = $state(false)
  let error = $state('')

  const queryClient = useQueryClient()

  const orgId = window.location.pathname.split('/organizations/')[1]?.split('/')[0] ?? ''

  const orgQuery = createQuery(() => ({
    queryFn: async (): Promise<OrgData> => {
      const res = await fetch(`/api/orgs/${orgId}`)
      if (!res.ok) throw new Error('Failed to fetch organization')
      return (await res.json()) as OrgData
    },
    queryKey: ['organization', orgId],
  }))

  const teamsQuery = createQuery(() => ({
    queryFn: async (): Promise<Team[]> => {
      const res = await fetch(`/api/orgs/${orgId}/teams`)
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = (await res.json()) as { teams: Team[] }
      return data.teams
    },
    queryKey: ['teams', orgId],
  }))

  const canCreate = $derived(
    Boolean(orgQuery.data && hasTeamPermission(orgQuery.data.membership.role, null, 'team.create'))
  )

  async function createTeam() {
    error = ''
    const parsed = createTeamSchema.safeParse({
      description: createDescription || undefined,
      name: createName,
    })
    if (!parsed.success) {
      error = parsed.error.issues[0]?.message ?? 'Invalid input'
      return
    }
    creating = true

    try {
      const res = await fetch(`/api/orgs/${orgId}/teams`, {
        body: JSON.stringify(parsed.data),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } }
        throw new Error(data.error?.message ?? 'Failed to create team')
      }

      await queryClient.invalidateQueries({ queryKey: ['teams', orgId] })
      createName = ''
      createDescription = ''
      showCreateForm = false
    } catch (caught) { // oxlint-disable-line unicorn/catch-error-name
      error = caught instanceof Error ? caught.message : 'Failed to create team'
    } finally {
      creating = false
    }
  }
</script>

<div class="space-y-6">
  {#if orgQuery.isPending}
    <div class="animate-pulse space-y-4">
      <div class="h-4 w-64 rounded bg-white/[0.06]"></div>
      <div class="h-8 w-48 rounded bg-white/[0.06]"></div>
      <div class="h-4 w-72 rounded bg-white/[0.06]"></div>
    </div>
  {:else if orgQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load organization.</p>
      <button
        onclick={() => orgQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else}
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 text-sm text-text-muted">
          <a href="/app/organizations" class="hover:text-text-secondary">Organizations</a>
          <span>/</span>
          <a href="/app/organizations/{orgId}" class="hover:text-text-secondary">
            {orgQuery.data?.organization.name ?? '...'}
          </a>
          <span>/</span>
          <span class="text-text-primary">Teams</span>
        </div>
        <h1 class="mt-2 text-2xl font-bold text-text-primary">Teams</h1>
        <p class="mt-1 text-sm text-text-muted">Manage teams within this organization</p>
      </div>
      {#if canCreate}
        <button
          onclick={() => (showCreateForm = !showCreateForm)}
          class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          {showCreateForm ? 'Cancel' : 'New Team'}
        </button>
      {/if}
    </div>
  {/if}

  {#if showCreateForm}
    <form
      class="rounded-lg border border-white/[0.06] bg-surface p-6"
      onsubmit={(e) => { e.preventDefault(); createTeam() }}
    >
      <h2 class="mb-4 text-lg font-semibold text-text-primary">Create Team</h2>

      {#if error}
        <div class="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      {/if}

      <div class="space-y-4">
        <div>
          <label for="team-name" class="mb-1.5 block text-sm font-medium text-text-secondary">Name</label>
          <input
            id="team-name"
            bind:value={createName}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="Engineering"
            required
          />
        </div>
        <div>
          <label for="team-desc" class="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            id="team-desc"
            bind:value={createDescription}
            rows={3}
            class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="What does this team work on?"
          ></textarea>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={creating || !createName.trim()}
            class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>
    </form>
  {/if}

  {#if teamsQuery.isPending}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="animate-pulse rounded-lg border border-white/[0.06] bg-surface p-6">
          <div class="h-5 w-48 rounded bg-white/[0.06]"></div>
          <div class="mt-3 h-4 w-72 rounded bg-white/[0.06]"></div>
        </div>
      {/each}
    </div>
  {:else if teamsQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load teams
    </div>
  {:else if teamsQuery.data?.length === 0}
    <div class="rounded-lg border border-white/[0.06] bg-surface p-12 text-center">
      <p class="text-text-muted">No teams yet</p>
      <p class="mt-2 text-sm text-text-subtle">Create your first team to start collaborating</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each teamsQuery.data ?? [] as teamItem (teamItem.id)}
        <a
          href="/app/organizations/{orgId}/teams/{teamItem.id}"
          class="block rounded-lg border border-white/[0.06] bg-surface p-6 transition-colors hover:border-white/[0.1] hover:bg-surface-deep"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-text-primary">{teamItem.name}</h3>
              {#if teamItem.description}
                <p class="mt-1.5 text-sm text-text-muted">{teamItem.description}</p>
              {/if}
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
