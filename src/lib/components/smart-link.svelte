<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { useSession } from '$lib/auth-client'

  interface Props {
    href: string
    fallback?: string
    class?: string
    children?: import('svelte').Snippet
    [key: string]: unknown
  }

  let { href, fallback, class: className, children, ...rest }: Props = $props()

  const session = useSession()

  const user = $derived(page.data.user ?? $session.data?.user ?? null)

  function isAuthPage(path: string) {
    return path === '/login' || path === '/register' || path === '/forgot-password' || path.startsWith('/reset-password')
  }

  function isProtectedPage(path: string) {
    return path.startsWith('/app') || path.startsWith('/admin')
  }

  function resolveTarget(): string {
    if (user) {
      if (isAuthPage(href)) {
        return fallback || '/app'
      }
    } else {
      if (isProtectedPage(href)) {
        return fallback || '/login'
      }
    }
    return href
  }

  function handleClick(e: MouseEvent) {
    e.preventDefault()
    goto(resolveTarget())
  }
</script>

<a {href} class={className} onclick={handleClick} {...rest}>
  {@render children?.()}
</a>
