<script lang="ts">
	import { useSession, signOut } from '$lib/auth-client'

	let { class: className = '' } = $props()

	const session = useSession()
	let dropdownOpen = $state(false)

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen
	}

	function closeDropdown() {
		dropdownOpen = false
	}

	async function handleSignOut() {
		closeDropdown()
		await signOut()
		window.location.href = '/'
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
			{#if $session.data?.user}
				<div class="relative" data-dropdown-menu>
					<button
						type="button"
						onclick={toggleDropdown}
						class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
					>
						<span class="text-text-primary">{$session.data?.user.name ?? $session.data?.user.email}</span>
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
								class="block w-full px-4 py-2 text-left text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary hover:bg-surface-elevated"
							>
								Log out
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login" class="hidden text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:block">Log in</a>
				<a href="/register" class="rounded-lg bg-text-primary px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-white">Get started</a>
			{/if}
		</div>
	</div>
</header>
