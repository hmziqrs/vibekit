<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { authClient, useSession } from '$lib/auth-client'
  import { resetPasswordSchema, type ResetPasswordInput } from '$lib/validators/auth'
  import PasswordStrength from '$lib/components/password-strength.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const session = useSession()

  // Redirect authenticated users away from reset-password
  $effect(() => {
    const user = $session.data?.user ?? page.data.user
    if (user) {
      goto('/app', { replaceState: true })
    }
  })

  let message = $state('')
  let done = $state(false)

  const token = $derived(page.url.searchParams.get('token') ?? '')

  const form = createForm(() => ({
    defaultValues: {
      confirmPassword: '',
      password: '',
      token: page.url.searchParams.get('token') ?? '',
    },
    onSubmit: async ({ value }: { value: ResetPasswordInput }) => {
      try {
        const res = await authClient.resetPassword({ newPassword: value.password })
        if (res?.error) {
          return {
            form: res.error.message ?? 'Failed to reset password.',
          }
        }
        // Revoke all other sessions to prevent session hijacking after password reset
        await authClient.revokeOtherSessions().catch(() => {})
        done = true
        message = 'Password reset successfully. You can now sign in.'
        return null
      } catch (error) {
        return {
          form: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        }
      }
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Set new password</Card.Title>
      <Card.Description class="text-text-muted">Choose a new password for your account</Card.Description>
    </Card.Header>

    <Card.Content>
      {#if !token}
        <p class="text-sm text-destructive">Invalid or missing reset token</p>
        <a
          href="/forgot-password"
          class="mt-4 block text-center text-sm text-text-primary hover:underline"
        >
          Request a new reset link
        </a>
      {:else if done}
        <div class="space-y-4">
          <p class="text-sm text-success">{message}</p>
          <a
            href="/login"
            class="block text-center text-sm text-text-primary hover:underline"
          >
            Back to login
          </a>
        </div>
      {:else}
        <form
          onsubmit={form.handleSubmit}
          class="space-y-4"
          novalidate
        >
          <form.Field name="password">
            {#snippet children(field)}
              <TanstackField
                field={field as never}
                label="New password"
                type="password"
                placeholder="Enter new password"
                autocomplete="new-password"
              />
              <PasswordStrength password={field.state.value} />
            {/snippet}
          </form.Field>

          <form.Field name="confirmPassword">
            {#snippet children(field)}
              <TanstackField
                field={field as never}
                label="Confirm new password"
                type="password"
                placeholder="Confirm new password"
                autocomplete="new-password"
              />
            {/snippet}
          </form.Field>

          <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
            {#snippet children(errorMessage)}
              {#if errorMessage}
                <p class="text-sm text-destructive">{errorMessage}</p>
              {/if}
            {/snippet}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {#snippet children(isSubmitting)}
              <Button type="submit" class="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Loading...' : 'Reset password'}
              </Button>
            {/snippet}
          </form.Subscribe>
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
