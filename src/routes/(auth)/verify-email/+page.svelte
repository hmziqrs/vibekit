<script lang="ts">
  import { page } from '$app/state'
  import { authClient } from '$lib/auth-client'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'
  import { z } from 'zod/v4'

  const resendSchema = z.object({
    email: z.email('Please enter a valid email address'),
  })

  type ResendInput = z.infer<typeof resendSchema>

  let message = $state('')
  let verifying = $state(false)
  let verified = $state(false)
  let failed = $state(false)
  let verifyAttempted = $state(false)

  const token = $derived(page.url.searchParams.get('token') ?? '')
  const initialEmail = $derived(page.url.searchParams.get('email') ?? '')

  // Trigger verification client-side once when token is present.
  $effect(() => {
    if (token && !verifyAttempted && !verified && !failed) {
      verifyAttempted = true
      verifyEmail(token)
    }
  })

  async function verifyEmail(t: string) {
    verifying = true
    try {
      const res = await authClient.verifyEmail({ query: { token: t } })
      if (res.error) {
        failed = true
      } else {
        verified = true
        message = 'Email verified! You can now log in.'
      }
    } catch {
      failed = true
    } finally {
      verifying = false
    }
  }

  const form = createForm(() => ({
    defaultValues: {
      email: initialEmail,
    },
    onSubmit: async ({ value }: { value: ResendInput }) => {
      try {
        const res = await authClient.sendVerificationEmail({
          callbackURL: '/verify-email',
          email: value.email,
        })
        if (res?.error) {
          return {
            form: res.error.message ?? 'Failed to send verification email.',
          }
        }
        message = 'Verification email sent! Check your inbox.'
        return null
      } catch (error) {
        return {
          form: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        }
      }
    },
    validators: {
      onSubmit: resendSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Verify email</Card.Title>
      <Card.Description class="text-text-muted">Check your inbox for a verification link</Card.Description>
    </Card.Header>

    <Card.Content>
      {#if verifying}
        <div class="flex justify-center py-4">
          <p class="text-sm text-text-muted">Verifying...</p>
        </div>
      {:else if verified}
        <div class="space-y-4">
          <p class="text-sm text-success">{message}</p>
          <a
            href="/login"
            class="block text-center text-sm text-text-primary hover:underline"
          >
            Go to login
          </a>
        </div>
      {:else if failed}
        <div class="space-y-4">
          {#if message}
            <p class="text-sm text-success">{message}</p>
          {/if}

          <form
            onsubmit={form.handleSubmit}
            class="space-y-3"
            novalidate
          >
            <form.Field name="email">
              {#snippet children(field)}
                <TanstackField
                  {field}
                  label="Email address"
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
                  {isSubmitting ? 'Loading...' : 'Resend verification email'}
                </Button>
              {/snippet}
            </form.Subscribe>
          </form>
        </div>
      {:else}
        <div class="space-y-4">
          {#if message}
            <p class="text-sm text-success">{message}</p>
          {/if}

          <p class="text-sm text-text-secondary">
            We've sent a verification link to your email address. Click the link to verify your
            account.
          </p>

          <form
            onsubmit={form.handleSubmit}
            class="space-y-3"
            novalidate
          >
            <form.Field name="email">
              {#snippet children(field)}
                <TanstackField
                  {field}
                  label="Email address"
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
                <Button type="submit" class="w-full" variant="outline" disabled={isSubmitting}>
                  {isSubmitting ? 'Loading...' : 'Resend verification email'}
                </Button>
              {/snippet}
            </form.Subscribe>
          </form>
        </div>
      {/if}
    </Card.Content>

    {#if !verified}
      <Card.Footer class="justify-center">
        <a href="/login" class="text-sm text-text-muted hover:text-text-primary transition-colors">
          Back to login
        </a>
      </Card.Footer>
    {/if}
  </Card.Root>
</div>
