<script lang="ts">
  import { page } from '$app/state'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'

  import { hasPermission, type OrgRole } from '$lib/permissions'

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

  interface OrgMember {
    email: string
    id: string
    image: string | null
    joinedAt: string
    name: string
    role: string
    userId: string
  }

  let inviteEmail = $state('')
  let inviteRole = $state('member')
  let inviting = $state(false)
  let inviteError = $state('')
  let inviteSuccess = $state('')
  let removingMemberId = $state('')
  let mutationError = $state('')

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

  const membersQuery = createQuery(() => ({
    enabled: Boolean(orgQuery.data),
    queryFn: async (): Promise<OrgMember[]> => {
      const res = await fetch(`/api/orgs/${orgId}/members`)
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = (await res.json()) as { members: OrgMember[] }
      return data.members
    },
    queryKey: ['organization-members', orgId],
  }))

  const canInvite = $derived(
    Boolean(orgQuery.data && hasPermission(orgQuery.data.membership.role as OrgRole, 'org.members.invite'))
  )
  const canManageMembers = $derived(
    Boolean(orgQuery.data && hasPermission(orgQuery.data.membership.role as OrgRole, 'org.members.manage'))
  )

  async function inviteMember() {
    if (!inviteEmail.trim()) return
    inviting = true
    inviteError = ''
    inviteSuccess = ''

    const res = await fetch(`/api/orgs/${orgId}/members/invite`, {
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } }
      inviteError = data.error?.message ?? 'Failed to send invitation'
      inviting = false
      return
    }

    inviteSuccess = `Invitation sent to ${inviteEmail}`
    inviteEmail = ''
    inviteRole = 'member'
    inviting = false
  }

  async function removeMember(memberId: string, memberName: string) {
    mutationError = ''
    removingMemberId = memberId
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove member')
      await queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] })
    } catch {
      mutationError = 'Failed to remove member'
    } finally {
      removingMemberId = ''
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    mutationError = ''
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        body: JSON.stringify({ role: newRole }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to change role')
      await queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] })
    } catch {
      mutationError = 'Failed to change role'
    }
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

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
</script>

<div class="space-y-6">
  {#if orgQuery.isPending}
    <div class="animate-pulse space-y-4">
      <div class="h-8 w-64 rounded bg-white/[0.06]"></div>
      <div class="h-4 w-96 rounded bg-white/[0.06]"></div>
    </div>
  {:else if orgQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load organization
    </div>
  {:else if orgQuery.data}
    {@const org = orgQuery.data.organization}
    {@const membership = orgQuery.data.membership}

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-text-primary">{org.name}</h1>
          <span class="rounded-full px-2 py-0.5 text-[11px] font-medium {getRoleBadgeColor(membership.role)}">
            {membership.role}
          </span>
        </div>
        {#if org.description}
          <p class="mt-1 text-sm text-text-muted">{org.description}</p>
        {/if}
        <p class="mt-1 text-xs text-text-subtle">/{org.slug} &middot; Created {formatDate(org.createdAt)}</p>
      </div>
      <div class="flex gap-2">
        {#if hasPermission(membership.role as OrgRole, 'org.settings.read')}
          <a
            href="/app/organizations/{org.id}/settings"
            class="rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-white/[0.04]"
          >
            Settings
          </a>
        {/if}
      </div>
    </div>

    <!-- Members Section -->
    <div class="rounded-lg border border-white/[0.06] bg-surface">
      <div class="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <h2 class="text-base font-semibold text-text-primary">Members</h2>
      </div>

      {#if mutationError}
        <p class="mx-6 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
      {/if}

      <!-- Invite Form -->
      {#if canInvite}
        <form
          class="border-b border-white/[0.06] px-6 py-4"
          onsubmit={(e) => { e.preventDefault(); inviteMember() }}
        >
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label for="invite-email" class="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
              <input
                id="invite-email"
                type="email"
                bind:value={inviteEmail}
                class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label for="invite-role" class="mb-1.5 block text-xs font-medium text-text-secondary">Role</label>
              <select
                id="invite-role"
                bind:value={inviteRole}
                class="rounded-lg border border-white/[0.06] bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </div>
          {#if inviteError}
            <p class="mt-2 text-xs text-destructive">{inviteError}</p>
          {/if}
          {#if inviteSuccess}
            <p class="mt-2 text-xs text-success">{inviteSuccess}</p>
          {/if}
        </form>
      {/if}

      <!-- Members List -->
      {#if membersQuery.isPending}
        <div class="space-y-0 p-6">
          {#each Array(3) as _}
            <div class="flex items-center gap-3 py-3">
              <div class="h-8 w-8 animate-pulse rounded-full bg-white/[0.06]"></div>
              <div class="h-4 w-32 animate-pulse rounded bg-white/[0.06]"></div>
            </div>
          {/each}
        </div>
      {:else if membersQuery.error}
        <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
          <p class="text-[14px] text-destructive">Failed to load members.</p>
          <button
            onclick={() => membersQuery.refetch()}
            class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
          >
            Try again
          </button>
        </div>
      {:else}
        <div class="divide-y divide-white/[0.04]">
          {#each membersQuery.data ?? [] as member (member.id)}
            <div class="flex items-center justify-between px-6 py-3">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[12px] font-medium text-text-secondary">
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p class="text-sm font-medium text-text-primary">{member.name}</p>
                  <p class="text-xs text-text-subtle">{member.email}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                {#if member.role !== 'owner' && canManageMembers}
                  <select
                    aria-label="Change role"
                    value={member.role}
                    onchange={(e) => changeRole(member.id, (e.target as HTMLSelectElement).value)}
                    class="rounded border border-white/[0.06] bg-surface-base px-2 py-1 text-xs text-text-secondary focus:border-brand focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onclick={() => removeMember(member.id, member.name)}
                    disabled={removingMemberId === member.id}
                    class="rounded px-2 py-1 text-xs text-text-subtle transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    Remove
                  </button>
                {:else}
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-medium {getRoleBadgeColor(member.role)}">
                    {member.role}
                  </span>
                {/if}
                <span class="text-[11px] text-text-faint">Joined {formatDate(member.joinedAt)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
