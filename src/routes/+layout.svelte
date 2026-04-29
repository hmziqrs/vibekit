<script lang="ts">
	import { setContext } from 'svelte'
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { useSession, signOut } from '$lib/auth-client';
	import type { AuthContext } from '$lib/auth.svelte';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { createQueryClient } from '$lib/query-client';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import ConsentBanner from '$lib/components/consent-banner.svelte';
	import SkipLink from '$lib/components/skip-link.svelte';

	let { children } = $props();
	const queryClient = createQueryClient();

	const session = useSession();
	const user = $derived(page.data.user ?? $session.data?.user ?? null);
	const isPending = $derived(browser && $session.isPending && !page.data.user);
	const isAdmin = $derived(user?.role === 'admin');

	async function logout(redirectTo = '/') {
		await signOut();
		await invalidate('app:auth');
		await goto(redirectTo);
	}

	setContext('auth', {
		get user() { return user },
		get isPending() { return isPending },
		get isAdmin() { return isAdmin },
		logout,
	} satisfies AuthContext);
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
