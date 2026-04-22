<script lang="ts">
  import { page } from '$app/state'
  import { authClient } from '$lib/auth-client'
  import { resetPasswordSchema } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'

  let password = $state('')
  let confirmPassword = $state('')
  let errors = $state<Record<string, string>>({})
  let serverError = $state('')
  let message = $state('')
  let loading = $state(false)
  let done = $state(false)

  let token = $derived(page.url.searchParams.get('token') ?? '')

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = resetPasswordSchema.safeParse({ token, password, confirmPassword })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    loading = true
    try {
      const res = await authClient.resetPassword({ newPassword: password })
      if (res.error) {
        serverError = res.error.message ?? 'Failed to reset password.'
        return
      }
      done = true
      message = 'Password reset successfully. You can now sign in.'
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
      <Card.Title class="text-text-primary">Set new password</Card.Title>
      <Card.Description class="text-text-muted">Choose a new password for your account</Card.Description>
    </Card.Header>

    <Card.Content>
      {#if !token}
        <p class="text-sm text-red-400">Invalid or missing reset token</p>
        <a
          href="/forgot-password"
          class="mt-4 block text-center text-sm text-text-primary hover:underline"
        >
          Request a new reset link
        </a>
      {:else if done}
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
            <Label for="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              bind:value={password}
              disabled={loading}
              autocomplete="new-password"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {#if errors.password}
              <p id="password-error" class="text-[12px] text-red-400">{errors.password}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              bind:value={confirmPassword}
              disabled={loading}
              autocomplete="new-password"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {#if errors.confirmPassword}
              <p id="confirmPassword-error" class="text-[12px] text-red-400">{errors.confirmPassword}</p>
            {/if}
          </div>

          <Button type="submit" class="w-full" disabled={loading}>
            {loading ? 'Loading...' : 'Reset password'}
          </Button>
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
