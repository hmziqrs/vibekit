<script lang="ts">
	import Nav from '$lib/components/nav.svelte'

	let { children } = $props()
</script>

<div class="min-h-screen bg-surface-base">
	<Nav />
	<main class="flex min-h-screen items-center justify-center px-6 pt-20">
		{@render children()}
	</main>
</div>
