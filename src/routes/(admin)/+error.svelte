<script lang="ts">
	import { page } from '$app/state'
	import Server from '@lucide/svelte/icons/server'
	import FileX from '@lucide/svelte/icons/file-x'
	import ShieldAlert from '@lucide/svelte/icons/shield-alert'

	const status = $derived(page.status)

	const config = $derived.by(() => {
		switch (status) {
			case 403: {
				return {
					description: "You don't have permission to access this resource.",
					title: 'Forbidden',
				}
			}
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
			default: {
				return {
					description: page.error?.message ?? 'An unexpected error occurred.',
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
			{#if status === 403}
				<ShieldAlert class="h-8 w-8 text-brand" />
			{:else if status === 404}
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
			href="/admin/dashboard"
			class="rounded-xl bg-brand px-6 py-2.5 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
		>
			Back to Dashboard
		</a>
	</div>
</div>
