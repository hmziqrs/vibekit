<script lang="ts">
  import { page } from '$app/state'
  import * as Card from '$lib/components/ui/card'

  const ERROR_MAP: Record<string, string> = {
    callback: 'OAuth callback failed. Please try again.',
    credential_account_not_found: 'No account found with those credentials.',
    invalid_credentials: 'Invalid email or password.',
    invalid_verification: 'The verification link is invalid or has expired.',
    session_expired: 'Your session has expired. Please sign in again.',
    unauthorized: 'You are not authorized to access this resource.',
  }

  const errorParam = $derived(page.url.searchParams.get('error') ?? '')
  const errorMessage = $derived(
    errorParam && ERROR_MAP[errorParam]
      ? ERROR_MAP[errorParam]
      : 'An authentication error occurred'
  )
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Authentication Error</Card.Title>
      <Card.Description class="text-text-muted">
        Something went wrong during sign-in
      </Card.Description>
    </Card.Header>

    <Card.Content>
      <div class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
        <p class="text-[13px] text-destructive">{errorMessage}</p>
      </div>

      <div class="mt-4 space-y-2">
        <a
          href="/login"
          class="block w-full rounded-lg bg-brand px-4 py-2 text-center text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Back to Login
        </a>
      </div>
    </Card.Content>
  </Card.Root>
</div>
