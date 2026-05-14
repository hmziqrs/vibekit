<script lang="ts">
  import { authClient, useSession } from '$lib/auth-client'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { forgotPasswordSchema, type ForgotPasswordInput } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const session = useSession()

  // Redirect authenticated users away from forgot-password
  $effect(() => {
    const user = $session.data?.user ?? page.data.user
    if (user) {
      goto('/app', { replaceState: true })
    }
  })

  let message = $state('')

  const form = createForm(() => ({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }: { value: ForgotPasswordInput }) => {
      try {
        const {origin} = window.location
        const res = await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: `${origin}/reset-password`,
        })
        if (res?.error) {
          return {
            form: res.error.message ?? 'Failed to send reset link.',
          }
        }
        message = 'Check your email for a reset link'
        return null
      } catch (error) {
        return {
          form: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        }
      }
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
  }))
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
          <form.Field name="email">
            {#snippet children(field)}
              <TanstackField
                field={field as never}
                label="Email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
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
                {isSubmitting ? 'Loading...' : 'Send reset link'}
              </Button>
            {/snippet}
          </form.Subscribe>
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
