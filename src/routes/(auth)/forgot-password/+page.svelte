<script lang="ts">
  import { authClient } from '$lib/auth-client'
  import { forgotPasswordSchema } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'

  let email = $state('')
  let errors = $state<Record<string, string>>({})
  let serverError = $state('')
  let message = $state('')
  let loading = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''
    message = ''

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    loading = true
    try {
      const origin = window.location.origin
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: `${origin}/reset-password`,
      })
      if (res.error) {
        serverError = res.error.message ?? 'Failed to send reset link.'
        return
      }
      message = 'Check your email for a reset link'
    } catch {
      serverError = 'Something went wrong. Please try again.'
    } finally {
      loading = false
    }
  }
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Reset password</Card.Title>
      <Card.Description class="text-text-muted">We'll send you a reset link</Card.Description>
    </Card.Header>

    <Card.Content>
      {#if message}
        <div class="space-y-4">
          <p class="text-sm text-green-400">{message}</p>
          <a
            href="/login"
            class="block text-center text-sm text-text-primary hover:underline"
          >
            Back to login
          </a>
        </div>
      {:else}
        <form onsubmit={handleSubmit} class="space-y-4" novalidate>
          {#if serverError}
            <p class="text-sm text-red-400">{serverError}</p>
          {/if}

          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              bind:value={email}
              disabled={loading}
              autocomplete="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {#if errors.email}
              <p id="email-error" class="text-[12px] text-red-400">{errors.email}</p>
            {/if}
          </div>

          <Button type="submit" class="w-full" disabled={loading}>
            {loading ? 'Loading...' : 'Send reset link'}
          </Button>
        </form>
      {/if}
    </Card.Content>

    <Card.Footer class="justify-center">
      <p class="text-sm text-text-muted">
        Remember your password?
        <a href="/login" class="text-text-primary hover:underline">Sign in</a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
