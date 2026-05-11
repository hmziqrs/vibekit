<script lang="ts">
  import { page } from '$app/state'
  import * as Card from '$lib/components/ui/card'

  const errorMessage = $derived(page.url.searchParams.get('error') ?? 'An authentication error occurred')
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
