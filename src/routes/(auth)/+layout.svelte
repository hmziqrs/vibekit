<script lang="ts">
	import Nav from '$lib/components/nav.svelte'

	const { children } = $props()
</script>

<svelte:head>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="min-h-screen bg-surface-base">
	<Nav />
	<main class="flex min-h-screen items-center justify-center px-6 pt-20">
		{@render children()}
	</main>
</div>
