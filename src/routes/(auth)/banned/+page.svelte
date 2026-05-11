<script lang="ts">
  import { page } from '$app/state'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'

  const reason = $derived(page.url.searchParams.get('reason') ?? '')
  const email = $derived(page.url.searchParams.get('email') ?? '')
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Account Suspended</Card.Title>
      <Card.Description class="text-text-muted">
        Your account has been suspended by an administrator.
      </Card.Description>
    </Card.Header>

    <Card.Content>
      <div class="space-y-4">
        {#if reason}
          <div>
            <p class="text-[12px] uppercase tracking-wider text-text-subtle">Reason</p>
            <p class="mt-1 text-[14px] text-text-primary">{reason}</p>
          </div>
        {/if}

        {#if email}
          <p class="text-[13px] text-text-muted">
            If you believe this is an error, you can submit an appeal using the button below.
          </p>
          <a href="/appeal?email={encodeURIComponent(email)}">
            <Button variant="outline" class="w-full">Submit Appeal</Button>
          </a>
        {/if}
      </div>
    </Card.Content>

    <Card.Footer class="justify-center">
      <a href="/login" class="text-sm text-text-muted transition-colors hover:text-text-primary">
        Back to login
      </a>
    </Card.Footer>
  </Card.Root>
</div>
