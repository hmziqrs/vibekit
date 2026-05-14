<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { hasTeamPermission, type OrgRole, type TeamRole } from '$lib/permissions'
  import { updateTeamSchema } from '$lib/validators/team'

  interface TeamDetail {
    team: {
      createdAt: string
      description: string | null
      id: string
      name: string
      organizationId: string
      updatedAt: string
    }
    teamMembership: { id: string; joinedAt: string; role: TeamRole } | null
  }

  let editName = $state('')
  let editDescription = $state('')
  let saving = $state(false)
  let saveError = $state('')
  let showDeleteConfirm = $state(false)
  let deleting = $state(false)
  let deleteError = $state('')
  let loaded = $state(false)

  const queryClient = useQueryClient()

  const pathParts = window.location.pathname.split('/')
  const orgId = pathParts[3] ?? ''
  const teamId = pathParts[5] ?? ''

  const orgQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch(`/api/orgs/${orgId}`)
      if (!res.ok) throw new Error('Failed')
      return (await res.json()) as { membership: { role: OrgRole } }
    },
    queryKey: ['organization', orgId],
  }))

  const teamQuery = createQuery(() => ({
    queryFn: async (): Promise<TeamDetail> => {
      const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return (await res.json()) as TeamDetail
    },
    queryKey: ['team', orgId, teamId],
  }))

  const canUpdate = $derived(
    Boolean(
      orgQuery.data?.membership.role &&
        teamQuery.data &&
        hasTeamPermission(
          orgQuery.data.membership.role,
          teamQuery.data.teamMembership?.role ?? null,
          'team.update'
        )
    )
  )

  const canDelete = $derived(
    Boolean(
      orgQuery.data?.membership.role &&
        teamQuery.data &&
        hasTeamPermission(
          orgQuery.data.membership.role,
          teamQuery.data.teamMembership?.role ?? null,
          'team.delete'
        )
    )
  )

  $effect(() => {
    if (teamQuery.data && !loaded) {
      editName = teamQuery.data.team.name
      editDescription = teamQuery.data.team.description ?? ''
      loaded = true
    }
  })

  async function saveTeam() {
    saveError = ''
    const parsed = updateTeamSchema.safeParse({
      description: editDescription || null,
      name: editName,
    })
    if (!parsed.success) {
      saveError = parsed.error.issues[0]?.message ?? 'Invalid input'
      return
    }
    saving = true

    const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}`, {
      body: JSON.stringify(parsed.data),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      saveError = data.error?.message ?? 'Failed to update team'
      saving = false
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['team', orgId, teamId] })
    saving = false
  }

  async function deleteTeam() {
    deleting = true
    deleteError = ''

    const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      deleteError = data.error?.message ?? 'Failed to delete team'
      deleting = false
      return
    }

    window.location.href = `/app/organizations/${orgId}/teams`
  }
</script>

<div class="space-y-6">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-2 text-sm text-text-muted">
    <a href="/app/organizations" class="hover:text-text-secondary">Organizations</a>
    <span>/</span>
    <a href="/app/organizations/{orgId}" class="hover:text-text-secondary">
      {orgId}
    </a>
    <span>/</span>
    <a href="/app/organizations/{orgId}/teams" class="hover:text-text-secondary">Teams</a>
    <span>/</span>
    <a href="/app/organizations/{orgId}/teams/{teamId}" class="hover:text-text-secondary">
      {teamQuery.data?.team.name ?? '...'}
    </a>
    <span>/</span>
    <span class="text-text-primary">Settings</span>
  </div>

  {#if teamQuery.isPending}
    <div class="animate-pulse space-y-6">
      <div class="h-8 w-64 rounded bg-white/[0.06]"></div>
      <div class="h-40 rounded-lg bg-white/[0.06]"></div>
    </div>
  {:else if teamQuery.data}
    <h1 class="text-2xl font-bold text-text-primary">Team Settings</h1>

    <!-- General Settings -->
    {#if canUpdate}
      <form
        class="rounded-xl border border-white/[0.06] bg-surface p-6"
        onsubmit={(e) => { e.preventDefault(); saveTeam() }}
      >
        <h2 class="mb-4 text-lg font-semibold text-text-primary">General</h2>

        {#if saveError}
          <div class="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{saveError}</div>
        {/if}

        <div class="space-y-4">
          <div>
            <label for="team-name" class="mb-1.5 block text-sm font-medium text-text-secondary">Name</label>
            <input
              id="team-name"
              bind:value={editName}
              disabled={saving}
              class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
              required
            />
          </div>
          <div>
            <label for="team-desc" class="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
            <textarea
              id="team-desc"
              bind:value={editDescription}
              rows={3}
              disabled={saving}
              class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
            ></textarea>
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
    {:else}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
        <p class="text-sm text-text-muted">You do not have permission to edit this team.</p>
      </div>
    {/if}

    <!-- Danger Zone -->
    {#if canDelete}
      <div class="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <h2 class="mb-2 text-lg font-semibold text-destructive">Danger Zone</h2>
        <p class="mb-4 text-sm text-text-muted">
          Deleting this team will remove it and all associated data. This action cannot be undone.
        </p>

        {#if deleteError}
          <div class="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{deleteError}</div>
        {/if}

        {#if showDeleteConfirm}
          <div class="space-y-3">
            <p class="text-sm text-text-secondary">Are you sure? Type the team name to confirm.</p>
            <button
              onclick={deleteTeam}
              disabled={deleting}
              class="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete Team'}
            </button>
            <button
              onclick={() => (showDeleteConfirm = false)}
              class="ml-3 rounded-lg border border-white/[0.06] px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        {:else}
          <button
            onclick={() => (showDeleteConfirm = true)}
            class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/20"
          >
            Delete Team
          </button>
        {/if}
      </div>
    {/if}
  {/if}
</div>
