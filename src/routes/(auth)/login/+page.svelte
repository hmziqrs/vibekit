<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { signIn, useSession } from '$lib/auth-client'
  import { loginSchema } from '$lib/validators/auth';
import type { LoginInput } from '$lib/validators/auth';
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const session = useSession()

  // Redirect already-authenticated users away from login page
  $effect(() => {
    const user = $session.data?.user ?? page.data.user
    if (user) {
      const next = page.url.searchParams.get('next') ?? '/app'
      goto(next, { replaceState: true })
    }
  })

  const form = createForm(() => ({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }: { value: LoginInput }) => {
      console.log("submit")
      try {
        console.log('value', value)
        const res = await signIn.email(value)
        if (res?.error) {
          return {
            form: res.error.message ?? 'Invalid email or password',
          }
        }
        const next = page.url.searchParams.get('next') ?? '/app'
        goto(next, { replaceState: true })
        return null
      } catch (err) {
        return {
          form: err instanceof Error ? err.message : 'Invalid email or password',
        }
      }
    },
    validators: {
      onSubmit: loginSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Log in</Card.Title>
      <Card.Description class="text-text-muted">Sign in to your account</Card.Description>
    </Card.Header>

    <Card.Content>
      <form
        onsubmit={form.handleSubmit}
        class="space-y-4"
        novalidate
      >
        <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
          {#snippet children(errorMessage)}
            {#if errorMessage}
              <p class="text-sm text-red-400">{errorMessage}</p>
            {/if}
          {/snippet}
        </form.Subscribe>

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
              placeholder="Enter your password"
              autocomplete="current-password"
            />
          {/snippet}
        </form.Field>

        <div class="flex justify-end">
          <a
            href="/forgot-password"
            class="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Forgot password?
          </a>
        </div>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {#snippet children(isSubmitting)}
            <Button type="submit" class="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Loading...' : 'Sign in'}
            </Button>
          {/snippet}
        </form.Subscribe>
      </form>
    </Card.Content>

    <Card.Footer class="justify-center">
      <p class="text-sm text-text-muted">
        Don't have an account?
        <a href="/register" class="text-text-primary hover:underline">Create one</a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
