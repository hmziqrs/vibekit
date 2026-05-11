<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { hasTeamPermission, type OrgRole, type TeamRole } from '$lib/permissions'

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

  interface TeamMemberRow {
    email: string
    id: string
    joinedAt: string
    name: string
    role: TeamRole
    userId: string
  }

  interface OrgMemberRow {
    email: string
    id: string
    name: string
    role: string
    userId: string
  }

  interface ActivityEntry {
    action: string
    actorName: string
    createdAt: string
    entityId: string | null
    entityType: string | null
    id: string
    metadata: string | null
  }

  let showAddMember = $state(false)
  let selectedUserId = $state('')
  let selectedRole = $state<TeamRole>('member')
  let adding = $state(false)
  let error = $state('')

  const queryClient = useQueryClient()

  const pathParts = window.location.pathname.split('/')
  const orgId = pathParts[3] ?? ''
  const teamId = pathParts[5] ?? ''

  const teamQuery = createQuery(() => ({
    queryFn: async (): Promise<TeamDetail> => {
      const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return (await res.json()) as TeamDetail
    },
    queryKey: ['team', orgId, teamId],
  }))

  const membersQuery = createQuery(() => ({
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}/members`)
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = (await res.json()) as { members: TeamMemberRow[] }
      return data.members
    },
    queryKey: ['team-members', orgId, teamId],
  }))

  const orgMembersQuery = createQuery(() => ({
    queryFn: async (): Promise<OrgMemberRow[]> => {
      const res = await fetch(`/api/orgs/${orgId}/members`)
      if (!res.ok) throw new Error('Failed to fetch org members')
      const data = (await res.json()) as { members: OrgMemberRow[] }
      return data.members
    },
    queryKey: ['org-members', orgId],
  }))

  const activityQuery = createQuery(() => ({
    queryFn: async (): Promise<ActivityEntry[]> => {
      const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}/activity`)
      if (!res.ok) throw new Error('Failed to fetch activity')
      const data = (await res.json()) as { activities: ActivityEntry[] }
      return data.activities
    },
    queryKey: ['team-activity', orgId, teamId],
  }))

  const orgRole = $derived(
    teamQuery.data ? (document.cookie.includes('role=admin') ? 'admin' as OrgRole : 'member' as OrgRole) : null
  )

  // Derive permissions from org role + team role
  const currentOrgRole = $derived(
    teamQuery.data
      ? (() => {
          // We need org membership role — fetch from orgQuery context
          return 'member' as OrgRole
        })()
      : null
  )

  // Actually we need the org membership role. Let's get it from orgQuery
  const orgQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch(`/api/orgs/${orgId}`)
      if (!res.ok) throw new Error('Failed')
      return (await res.json()) as { membership: { role: OrgRole } }
    },
    queryKey: ['organization', orgId],
  }))

  const canAddMembers = $derived(
    Boolean(
      orgQuery.data?.membership.role &&
        teamQuery.data &&
        hasTeamPermission(
          orgQuery.data.membership.role,
          teamQuery.data.teamMembership?.role ?? null,
          'team.members.add'
        )
    )
  )

  const canManageMembers = $derived(
    Boolean(
      orgQuery.data?.membership.role &&
        teamQuery.data &&
        hasTeamPermission(
          orgQuery.data.membership.role,
          teamQuery.data.teamMembership?.role ?? null,
          'team.members.manage'
        )
    )
  )

  const canUpdateTeam = $derived(
    Boolean(
      orgQuery.data?.membership.role &&
        teamQuery.data &&
        hasTeamPermission(
          orgQuery.data.membership.role,
          teamQuery.data.teamMembership?.role ?? null,
          'team.settings.read'
        )
    )
  )

  const availableMembers = $derived(
    (orgMembersQuery.data ?? []).filter(
      (om) => !(membersQuery.data ?? []).some((tm) => tm.userId === om.userId)
    )
  )

  async function addMember() {
    if (!selectedUserId) return
    adding = true
    error = ''

    const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}/members`, {
      body: JSON.stringify({ role: selectedRole, userId: selectedUserId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      error = data.error?.message ?? 'Failed to add member'
      adding = false
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['team-members', orgId, teamId] })
    selectedUserId = ''
    selectedRole = 'member'
    showAddMember = false
    adding = false
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ['team-members', orgId, teamId] })
    }
  }

  async function changeRole(memberId: string, newRole: TeamRole) {
    const res = await fetch(`/api/orgs/${orgId}/teams/${teamId}/members/${memberId}`, {
      body: JSON.stringify({ role: newRole }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })

    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ['team-members', orgId, teamId] })
    }
  }

  function getRoleBadgeColor(role: string) {
    const colors: Record<string, string> = {
      lead: 'bg-amber-500/20 text-amber-400',
      member: 'bg-emerald-500/20 text-emerald-400',
    }
    return colors[role] ?? 'bg-gray-500/20 text-gray-400'
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  function formatAction(action: string): string {
    const labels: Record<string, string> = {
      'team.create': 'Created team',
      'team.delete': 'Deleted team',
      'team.member.add': 'Added member',
      'team.member.remove': 'Removed member',
      'team.member.update_role': 'Changed role',
      'team.update': 'Updated team',
    }
    return labels[action] ?? action
  }
</script>

<div class="space-y-6">
  {#if teamQuery.isPending}
    <div class="animate-pulse space-y-6">
      <div class="h-8 w-64 rounded bg-white/[0.06]"></div>
      <div class="h-40 rounded-lg bg-white/[0.06]"></div>
    </div>
  {:else if teamQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load team
    </div>
  {:else if teamQuery.data}
    {@const teamDetail = teamQuery.data}

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
      <span class="text-text-primary">{teamDetail.team.name}</span>
    </div>

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">{teamDetail.team.name}</h1>
        {#if teamDetail.team.description}
          <p class="mt-1 text-sm text-text-muted">{teamDetail.team.description}</p>
        {/if}
      </div>
      {#if canUpdateTeam}
        <a
          href="/app/organizations/{orgId}/teams/{teamId}/settings"
          class="rounded-lg border border-white/[0.06] px-4 py-2 text-sm text-text-secondary transition-colors hover:border-white/[0.1] hover:text-text-primary"
        >
          Settings
        </a>
      {/if}
    </div>

    <!-- Members Section -->
    <div>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-text-primary">Members</h2>
        {#if canAddMembers}
          <button
            onclick={() => (showAddMember = !showAddMember)}
            class="text-sm text-brand hover:underline"
          >
            {showAddMember ? 'Cancel' : 'Add Member'}
          </button>
        {/if}
      </div>

      {#if showAddMember}
        <form
          class="mt-4 rounded-lg border border-white/[0.06] bg-surface p-4"
          onsubmit={(e) => { e.preventDefault(); addMember() }}
        >
          {#if error}
            <div class="mb-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
          {/if}

          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label for="add-member" class="mb-1.5 block text-sm font-medium text-text-secondary">User</label>
              <select
                id="add-member"
                bind:value={selectedUserId}
                class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Select a member...</option>
                {#each availableMembers as member (member.userId)}
                  <option value={member.userId}>{member.name} ({member.email})</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="add-role" class="mb-1.5 block text-sm font-medium text-text-secondary">Role</label>
              <select
                id="add-role"
                bind:value={selectedRole}
                class="rounded-lg border border-white/[0.06] bg-surface-base px-4 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="member">Member</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding || !selectedUserId}
              class="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      {/if}

      {#if membersQuery.isPending}
        <div class="mt-4 space-y-3">
          {#each Array(3) as _}
            <div class="animate-pulse rounded-lg border border-white/[0.06] bg-surface p-4">
              <div class="h-4 w-48 rounded bg-white/[0.06]"></div>
            </div>
          {/each}
        </div>
      {:else if membersQuery.data}
        <div class="mt-4 overflow-hidden rounded-xl border border-white/[0.06] bg-surface">
          <div class="divide-y divide-white/[0.04]">
            {#each membersQuery.data as member (member.id)}
              <div class="flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-medium text-text-secondary">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p class="text-[13px] text-text-primary">{member.name}</p>
                    <p class="text-[11px] text-text-subtle">{member.email}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  {#if canManageMembers}
                    <select
                      value={member.role}
                      onchange={(e) => {
                        const select = e.target as HTMLSelectElement
                        changeRole(member.id, select.value as TeamRole)
                      }}
                      class="rounded border border-white/[0.06] bg-surface-base px-2 py-1 text-[12px] text-text-secondary focus:border-brand focus:outline-none"
                    >
                      <option value="lead">Lead</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      onclick={() => removeMember(member.id)}
                      class="text-[12px] text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  {:else}
                    <span class="rounded-full px-2 py-0.5 text-[11px] font-medium {getRoleBadgeColor(member.role)}">
                      {member.role}
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Activity Section -->
    <div>
      <h2 class="text-lg font-semibold text-text-primary">Recent Activity</h2>
      {#if activityQuery.isPending}
        <div class="mt-4 space-y-3">
          {#each Array(3) as _}
            <div class="animate-pulse h-12 rounded-lg bg-white/[0.06]"></div>
          {/each}
        </div>
      {:else if activityQuery.data && activityQuery.data.length > 0}
        <div class="mt-4 overflow-hidden rounded-xl border border-white/[0.06] bg-surface">
          <div class="divide-y divide-white/[0.04]">
            {#each activityQuery.data as entry (entry.id)}
              <div class="flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-medium text-text-secondary">
                    {entry.actorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p class="text-[13px] text-text-primary">
                      <span class="font-medium">{entry.actorName}</span>
                      <span class="ml-1 text-text-muted">{formatAction(entry.action)}</span>
                    </p>
                    {#if entry.entityType}
                      <p class="text-[11px] text-text-subtle">{entry.entityType}</p>
                    {/if}
                  </div>
                </div>
                <span class="shrink-0 text-[11px] text-text-faint">{formatTimeAgo(entry.createdAt)}</span>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-6">
          <p class="text-[13px] text-text-muted">No activity recorded yet.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>
