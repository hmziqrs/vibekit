<script lang="ts">
	let { class: className = '' } = $props()
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
			<a href="/login" class="hidden text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:block">Log in</a>
			<a href="/register" class="rounded-lg bg-text-primary px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-white">Get started</a>
		</div>
	</div>
</header>
