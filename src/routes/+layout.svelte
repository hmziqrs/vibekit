<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { createQueryClient } from '$lib/query-client';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ConsentBanner from '$lib/components/consent-banner.svelte';
	import SkipLink from '$lib/components/skip-link.svelte';

	let { children } = $props();
	const queryClient = createQueryClient();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<SkipLink />
<QueryClientProvider client={queryClient}>
	<main id="main">
		{@render children()}
	</main>
</QueryClientProvider>
<ConsentBanner />

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
		>{locale}</a>
	{/each}
</div>
