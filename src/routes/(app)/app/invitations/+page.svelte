<script lang="ts">
  import { authClient, useSession } from '$lib/auth-client'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'

  const session = useSession()

  interface Invitation {
    createdAt: string
    email: string
    expiresAt: string
    id: string
    organizationId: string
    organizationName: string
    organizationSlug: string
    role: string
    token: string
  }

  let invitations = $state<Invitation[]>([])
  let loading = $state(true)
  let error = $state('')
  let acceptingId = $state<string | null>(null)
  let decliningId = $state<string | null>(null)

  $effect(() => {
    if ($session.data?.user) {
      loadInvitations()
    }
  })

  async function loadInvitations() {
    loading = true
    error = ''
    try {
      const res = await fetch('/api/invitations')
      if (!res.ok) throw new Error('Failed to load invitations')
      const data = await res.json() as { invitations?: Array<{ id: string }> }
      invitations = data.invitations ?? []
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading = false
    }
  }

  async function acceptInvitation(token: string, id: string) {
    acceptingId = id
    error = ''
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(data.error?.message ?? 'Failed to accept invitation')
      }
      invitations = invitations.filter((inv) => inv.id !== id)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      acceptingId = null
    }
  }

  async function declineInvitation(token: string, id: string) {
    decliningId = id
    error = ''
    try {
      const res = await fetch(`/api/invitations/${token}/decline`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(data.error?.message ?? 'Failed to decline invitation')
      }
      invitations = invitations.filter((inv) => inv.id !== id)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      decliningId = null
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function formatRole(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }
</script>

<div class="w-full max-w-2xl space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-text-primary">Invitations</h1>
    <p class="mt-1 text-sm text-text-muted">
      Pending organization invitations for your account
    </p>
  </div>

  {#if loading}
    <div class="py-8 text-center text-text-muted">Loading...</div>
  {:else if error}
    <div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <p class="text-sm text-destructive">{error}</p>
    </div>
  {:else if invitations.length === 0}
    <Card.Root>
      <Card.Content class="py-12 text-center">
        <p class="text-text-muted">No pending invitations</p>
        <p class="mt-1 text-sm text-text-subtle">
          When someone invites you to an organization, it will appear here
        </p>
      </Card.Content>
    </Card.Root>
  {:else}
    {#each invitations as invitation (invitation.id)}
      <Card.Root>
        <Card.Content class="flex items-center justify-between gap-4 py-4">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-text-primary">
              {invitation.organizationName}
            </p>
            <p class="mt-0.5 text-sm text-text-muted">
              Invited as <span class="font-medium text-text-secondary">{formatRole(invitation.role)}</span>
              &middot; Expires {formatDate(invitation.expiresAt)}
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              size="sm"
              onclick={() => acceptInvitation(invitation.token, invitation.id)}
              disabled={acceptingId === invitation.id || decliningId === invitation.id}
            >
              {acceptingId === invitation.id ? 'Accepting...' : 'Accept'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onclick={() => declineInvitation(invitation.token, invitation.id)}
              disabled={acceptingId === invitation.id || decliningId === invitation.id}
            >
              {decliningId === invitation.id ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
  {/if}
</div>
