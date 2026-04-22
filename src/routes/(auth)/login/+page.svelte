<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { signIn } from '$lib/auth-client'
  import { loginSchema } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'

  let email = $state('')
  let password = $state('')
  let errors = $state<Record<string, string>>({})
  let serverError = $state('')
  let loading = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    loading = true
    try {
      const res = await signIn.email({ email, password })
      if (res.error) {
        serverError = res.error.message ?? 'Invalid email or password'
        return
      }
      const next = $page.url.searchParams.get('next') ?? '/app'
      goto(next, { replaceState: true })
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
      <Card.Title class="text-text-primary">Log in</Card.Title>
      <Card.Description class="text-text-muted">Sign in to your account</Card.Description>
    </Card.Header>

    <Card.Content>
      <form onsubmit={handleSubmit} class="space-y-4">
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
          />
          {#if errors.email}
            <p class="text-[12px] text-red-400">{errors.email}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            bind:value={password}
            disabled={loading}
            autocomplete="current-password"
          />
          {#if errors.password}
            <p class="text-[12px] text-red-400">{errors.password}</p>
          {/if}
        </div>

        <div class="flex justify-end">
          <a
            href="/forgot-password"
            class="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" class="w-full" disabled={loading}>
          {loading ? 'Loading...' : 'Sign in'}
        </Button>
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
