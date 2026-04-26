<script lang="ts">
	import { useSession, signOut } from '$lib/auth-client'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import { browser } from '$app/environment'
	import SmartLink from './smart-link.svelte'

	let { class: className = '' } = $props()

	const session = useSession()
	let dropdownOpen = $state(false)
	let signingOut = $state(false)

	// Use server-rendered user as synchronous initial state to prevent flash.
	// Once client hydrates, useSession() takes over for reactive updates.
	const user = $derived($session.data?.user ?? page.data.user ?? null)
	// Only show initializing skeleton on the client; SSR pages know the user immediately
	const isInitializing = $derived(browser && $session.isPending && !page.data.user)

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen
	}

	function closeDropdown() {
		dropdownOpen = false
	}

	async function handleSignOut() {
		closeDropdown()
		signingOut = true
		await signOut()
		signingOut = false
		goto('/')
	}

	$effect(() => {
		if (!dropdownOpen) return
		function handleClickOutside(e: MouseEvent) {
			const target = e.target as HTMLElement
			if (!target.closest('[data-dropdown-menu]')) {
				closeDropdown()
			}
		}
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	})
</script>

<header class="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-surface-base/80 backdrop-blur-xl {className}">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-2.5">
			<div class="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			</div>
			<span class="text-[15px] font-semibold tracking-tight text-text-primary">Vibekit</span>
		</a>

		<nav class="hidden items-center gap-8 md:flex">
			<a href="/features" class="text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary">Features</a>
			<a href="/pricing" class="text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary">Pricing</a>
			<a href="/blog" class="text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary">Blog</a>
		</nav>

		<div class="flex items-center gap-3">
			{#if isInitializing}
				<!-- Loading skeleton to prevent auth flash -->
				<div class="h-8 w-24 animate-pulse rounded-lg bg-white/[0.04]"></div>
			{:else if user}
				<div class="relative" data-dropdown-menu>
					<button
						type="button"
						onclick={toggleDropdown}
						class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
						disabled={signingOut}
					>
						<span class="text-text-primary">{user.name ?? user.email}</span>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform {dropdownOpen ? 'rotate-180' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
					</button>

					{#if dropdownOpen}
						<div
							class="absolute right-0 top-full mt-2 w-48 rounded-lg border border-white/[0.06] bg-surface py-1 shadow-lg"
						>
							<a
								href="/app"
								onclick={closeDropdown}
								class="block px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary hover:bg-surface-elevated"
							>
								Dashboard
							</a>
							<a
								href="/app/settings"
								onclick={closeDropdown}
								class="block px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary hover:bg-surface-elevated"
							>
								Settings
							</a>
							<div class="my-1 border-t border-white/[0.06]"></div>
							<button
								type="button"
								onclick={handleSignOut}
								disabled={signingOut}
								class="block w-full px-4 py-2 text-left text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary hover:bg-surface-elevated disabled:opacity-50"
							>
								{signingOut ? 'Signing out...' : 'Log out'}
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<SmartLink
          href="/login"
          fallback="/app"
          class="text-sm text-text-muted hover:text-text-primary transition-colors"
          >Log in</SmartLink
        >
        <SmartLink
          href="/register"
          fallback="/app"
          class="text-sm px-3 py-1.5 bg-accent text-white rounded-md hover:opacity-90 transition-opacity"
          >Get started</SmartLink
        >
			{/if}
		</div>
	</div>
</header>
