<script lang="ts">
	let { children } = $props()
</script>

<div class="flex min-h-screen bg-surface-base">
	<aside class="hidden w-64 shrink-0 border-r border-white/[0.06] bg-surface md:block">
		<div class="p-6">
			<a href="/" class="flex items-center gap-2.5">
				<div class="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				</div>
				<span class="text-[15px] font-semibold tracking-tight text-text-primary">Vibekit</span>
			</a>
		</div>
		<nav class="space-y-1 px-3">
			<a href="/app/dashboard" class="block rounded-lg px-3 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary">Dashboard</a>
			<a href="/app/profile" class="block rounded-lg px-3 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary">Profile</a>
			<a href="/app/settings" class="block rounded-lg px-3 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary">Settings</a>
		</nav>
	</aside>

	<div class="flex-1">
		<header class="flex h-14 items-center justify-between border-b border-white/[0.06] px-6">
			<span class="text-[14px] font-medium text-text-secondary">App</span>
		</header>
		<main class="p-6">
			{@render children()}
		</main>
	</div>
</div>
