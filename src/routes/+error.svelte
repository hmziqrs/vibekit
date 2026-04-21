<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Lock from '@lucide/svelte/icons/lock';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import FileX from '@lucide/svelte/icons/file-x';
	import Server from '@lucide/svelte/icons/server';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} — Error</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
	<div class="pointer-events-none absolute inset-0 opacity-30" style="background: radial-gradient(ellipse at center, var(--glow-brand) 0%, transparent 60%);"></div>

	<div class="relative text-center">
		<div class="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
			{#if status === 400}
				<CircleAlert class="h-10 w-10 text-brand" />
			{:else if status === 401}
				<Lock class="h-10 w-10 text-brand" />
			{:else if status === 403}
				<ShieldAlert class="h-10 w-10 text-brand" />
			{:else if status === 404}
				<FileX class="h-10 w-10 text-brand" />
			{:else if status === 500}
				<Server class="h-10 w-10 text-brand" />
			{:else}
				<TriangleAlert class="h-10 w-10 text-brand" />
			{/if}
		</div>

		<div class="mb-4">
			<span class="text-[13px] font-medium uppercase tracking-wider text-brand">Error {status}</span>
		</div>

		<h1 class="mb-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight text-text-primary">
			{#if status === 400}Bad Request
			{:else if status === 401}Unauthorized
			{:else if status === 403}Forbidden
			{:else if status === 404}Not Found
			{:else if status === 500}Internal Server Error
			{:else}Something Went Wrong{/if}
		</h1>

		<p class="mx-auto mb-10 max-w-md text-[15px] leading-relaxed text-text-muted">
			{#if status === 400}The server could not understand your request. Please check the URL and try again.
			{:else if status === 401}You need to sign in to access this page. Please log in or try again.
			{:else if status === 403}You don't have permission to access this resource. Contact the administrator if you believe this is an error.
			{:else if status === 404}The page you're looking for doesn't exist or has been moved. Check the URL or go back home.
			{:else if status === 500}Something went wrong on our end. We are working to fix it. Please try again later.
			{:else}{page.error?.message ?? 'An unexpected error occurred. Please try again.'}{/if}
		</p>

		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a
				href="/"
				class="rounded-xl bg-brand px-7 py-3 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
			>
				Go back home
			</a>
			<button
				onclick={() => history.back()}
				class="rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary"
			>
				Go back
			</button>
		</div>
	</div>
</div>
