<script lang="ts">
  import { authClient } from '$lib/auth-client'
  import { forgotPasswordSchema, type ForgotPasswordInput } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  let message = $state('')

  const form = createForm(() => ({
    defaultValues: {
      email: '',
    },
    validators: {
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value }: { value: ForgotPasswordInput }) => {
      try {
        const origin = window.location.origin
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
      } catch (err) {
        return {
          form: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        }
      }
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
          <p class="text-sm text-green-400">{message}</p>
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
                {field}
                label="Email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            {/snippet}
          </form.Field>

          <form.Subscribe selector={(state) => (state as any).errorMap?.onSubmit?.form as string | undefined}>
            {#snippet children(errorMessage)}
              {#if errorMessage}
                <p class="text-sm text-red-400">{errorMessage}</p>
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
