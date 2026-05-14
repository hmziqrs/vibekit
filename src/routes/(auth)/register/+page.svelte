<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { signUp, useSession } from '$lib/auth-client'
  import { registerSchema, type RegisterInput } from '$lib/validators/auth'
  import PasswordStrength from '$lib/components/password-strength.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import SocialLoginButtons from '$lib/components/social-login-buttons.svelte'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const session = useSession()

  // Redirect already-authenticated users away from register page
  $effect(() => {
    const user = $session.data?.user ?? page.data.user
    if (user) {
      goto('/app', { replaceState: true })
    }
  })

  const form = createForm(() => ({
    defaultValues: {
      confirmPassword: '',
      email: '',
      name: '',
      password: '',
    },
    onSubmit: async ({ value }: { value: RegisterInput }) => {
      try {
        const res = await signUp.email(value)
        if (res?.error) {
          return {
            form: res.error.message ?? 'Registration failed. Please try again.',
          }
        }
        goto(`/verify-email?email=${encodeURIComponent(value.email)}`, { replaceState: true })
        return null
      } catch (error) {
        return {
          form: error instanceof Error ? error.message : 'Registration failed. Please try again.',
        }
      }
    },
    validators: {
      onSubmit: registerSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Create account</Card.Title>
      <Card.Description class="text-text-muted">Get started with Vibekit</Card.Description>
    </Card.Header>

    <Card.Content>
      <SocialLoginButtons callbackURL="/app" />

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border"></span>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-text-muted">or</span>
        </div>
      </div>

      <form
        onsubmit={form.handleSubmit}
        class="space-y-4"
        novalidate
      >
        <form.Field name="name">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Name"
              placeholder="Your name"
              autocomplete="name"
            />
          {/snippet}
        </form.Field>

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

        <form.Field name="password">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Password"
              type="password"
              placeholder="Create a password"
              autocomplete="new-password"
            />
            <PasswordStrength password={field.state.value} />
          {/snippet}
        </form.Field>

        <form.Field name="confirmPassword">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          {/snippet}
        </form.Subscribe>
      </form>
    </Card.Content>

    <Card.Footer class="justify-center">
      <p class="text-sm text-text-muted">
        Already have an account?
        <a href="/login" class="text-text-primary hover:underline">Sign in</a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
