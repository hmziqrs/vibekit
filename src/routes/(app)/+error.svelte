<script lang="ts">
	import { page } from '$app/state'
	import Server from '@lucide/svelte/icons/server'
	import FileX from '@lucide/svelte/icons/file-x'

	const status = $derived(page.status)

	const config = $derived.by(() => {
		switch (status) {
			case 404: {
				return {
					description: "The page you're looking for doesn't exist.",
					title: 'Not Found',
				}
			}
			case 500: {
				return {
					description: 'Something went wrong. Please try again later.',
					title: 'Server Error',
				}
			}
			case 503: {
				return {
					description: 'The service is temporarily unavailable. Please try again in a moment.',
					title: 'Maintenance Mode',
				}
			}
			default: {
				return {
					description: 'An unexpected error occurred. Please try again.',
					title: 'Something Went Wrong',
				}
			}
		}
	})
</script>

<svelte:head>
	<title>{status} — {config.title}</title>
</svelte:head>

<div class="flex flex-1 items-center justify-center">
	<div class="text-center">
		<div
			class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]"
		>
			{#if status === 404}
				<FileX class="h-8 w-8 text-brand" />
			{:else}
				<Server class="h-8 w-8 text-brand" />
			{/if}
		</div>

		<span class="mb-2 block text-[13px] font-medium uppercase tracking-wider text-brand">
			Error {status}
		</span>

		<h1 class="mb-3 text-xl font-semibold text-text-primary">{config.title}</h1>
		<p class="mb-6 text-sm text-text-muted">{config.description}</p>

		<a
			href="/app/dashboard"
			class="rounded-xl bg-brand px-6 py-2.5 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
		>
			Back to Dashboard
		</a>
	</div>
</div>
