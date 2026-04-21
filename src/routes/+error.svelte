<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import Server from '@lucide/svelte/icons/server';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import type { Component } from 'svelte';

	const status = $derived(page.status);

	const errorConfig = $derived.by(() => {
		switch (status) {
			case 400:
				return {
					title: 'Bad Request',
					message: 'The server could not understand your request. Please check the URL and try again.',
					icon: AlertCircle as unknown as Component
				};
			case 401:
				return {
					title: 'Unauthorized',
					message: 'You need to sign in to access this page. Please log in or try again.',
					icon: Lock as unknown as Component
				};
			case 403:
				return {
					title: 'Forbidden',
					message: "You don't have permission to access this resource. Contact the administrator if you believe this is an error.",
					icon: ShieldAlert as unknown as Component
				};
			case 404:
				return {
					title: 'Not Found',
					message: "The page you're looking for doesn't exist or has been moved. Check the URL or go back home.",
					icon: FileQuestion as unknown as Component
				};
			case 500:
				return {
					title: 'Internal Server Error',
					message: "Something went wrong on our end. We are working to fix it. Please try again later.",
					icon: Server as unknown as Component
				};
			default:
				return {
					title: 'Something Went Wrong',
					message: page.error?.message ?? 'An unexpected error occurred. Please try again.',
					icon: AlertTriangle as unknown as Component
				};
		}
	});
</script>

<svelte:head>
	<title>{status} — {errorConfig.title}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
	<div class="pointer-events-none absolute inset-0 opacity-30" style="background: radial-gradient(ellipse at center, rgba(232,184,109,0.06) 0%, transparent 60%);"></div>

	<div class="relative text-center">
		<div class="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
			<errorConfig.icon class="h-10 w-10 text-[#e8b86d]" />
		</div>

		<div class="mb-4">
			<span class="text-[13px] font-medium uppercase tracking-wider text-[#e8b86d]">Error {status}</span>
		</div>

		<h1 class="mb-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight text-[#f5f5f5]">
			{errorConfig.title}
		</h1>

		<p class="mx-auto mb-10 max-w-md text-[15px] leading-relaxed text-[#737373]">
			{errorConfig.message}
		</p>

		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a
				href="/"
				class="rounded-xl bg-[#e8b86d] px-7 py-3 text-[14px] font-semibold text-[#050505] transition-all hover:bg-[#d4a55f]"
			>
				Go back home
			</a>
			<button
				onclick={() => history.back()}
				class="rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-[#a3a3a3] transition-all hover:border-white/[0.2] hover:text-[#f5f5f5]"
			>
				Go back
			</button>
		</div>
	</div>
</div>
