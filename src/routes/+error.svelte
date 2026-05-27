<script lang="ts">
	import { page } from '$app/state'
	import favicon from '$lib/assets/favicon.svg'
	import CircleAlert from '@lucide/svelte/icons/circle-alert'
	import CloudOff from '@lucide/svelte/icons/cloud-off'
	import FileX from '@lucide/svelte/icons/file-x'
	import Lock from '@lucide/svelte/icons/lock'
	import Server from '@lucide/svelte/icons/server'
	import ShieldAlert from '@lucide/svelte/icons/shield-alert'
	import Timer from '@lucide/svelte/icons/timer'
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert'

	const status = $derived(page.status)

	const config = $derived.by(() => {
		switch (status) {
			case 400: {
				return {
					description: 'The server could not understand your request. Please check the URL and try again.',
					icon: CircleAlert,
					primary: { href: '/', label: 'Go back home' },
					secondary: { action: 'back' as const, label: 'Go back' },
					title: 'Bad Request',
				}
			}
			case 401: {
				return {
					description: 'You need to sign in to access this page.',
					icon: Lock,
					primary: { href: '/login', label: 'Sign in' },
					secondary: { action: 'back' as const, label: 'Go back' },
					title: 'Unauthorized',
				}
			}
			case 403: {
				return {
					description:
						"You don't have permission to access this resource. Contact the administrator if you believe this is an error.",
					icon: ShieldAlert,
					primary: { href: '/', label: 'Go back home' },
					secondary: { action: 'back' as const, label: 'Go back' },
					title: 'Forbidden',
				}
			}
			case 404: {
				return {
					description:
						"The page you're looking for doesn't exist or has been moved. Check the URL or go back home.",
					icon: FileX,
					primary: { href: '/', label: 'Go back home' },
					secondary: { action: 'back' as const, label: 'Go back' },
					title: 'Not Found',
				}
			}
			case 429: {
				return {
					description: "You've made too many requests. Please wait a moment and try again.",
					icon: Timer,
					primary: { href: '/', label: 'Go back home' },
					secondary: { action: 'reload' as const, label: 'Try again' },
					title: 'Too Many Requests',
				}
			}
			case 500: {
				return {
					description:
						'Something went wrong on our end. We are working to fix it. Please try again later.',
					icon: Server,
					primary: { action: 'reload' as const, label: 'Try again' },
					secondary: { href: '/', label: 'Go back home' },
					title: 'Internal Server Error',
				}
			}
			case 503: {
				return {
					description:
						'The service is temporarily unavailable. This is usually brief — please try again in a moment.',
					icon: CloudOff,
					primary: { action: 'reload' as const, label: 'Try again' },
					secondary: { href: '/', label: 'Go back home' },
					title: 'Service Unavailable',
				}
			}
			default: {
				return {
					description: 'An unexpected error occurred. Please try again.',
					icon: TriangleAlert,
					primary: { href: '/', label: 'Go back home' },
					secondary: { action: 'back' as const, label: 'Go back' },
					title: 'Something Went Wrong',
				}
			}
		}
	})

	const Icon = $derived(config.icon)
</script>

<svelte:head>
	<title>{status} — {config.title}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
	<div
		class="pointer-events-none absolute inset-0 opacity-30"
		style="background: radial-gradient(ellipse at center, var(--glow-brand) 0%, transparent 60%);"
	></div>

	<div class="relative text-center">
		<div
			class="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]"
		>
			<Icon class="h-10 w-10 text-brand" />
		</div>

		<div class="mb-4">
			<span class="text-[13px] font-medium uppercase tracking-wider text-brand">Error {status}</span>
		</div>

		<h1
			class="mb-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight text-text-primary"
		>
			{config.title}
		</h1>

		<p class="mx-auto mb-10 max-w-md text-[15px] leading-relaxed text-text-muted">
			{config.description}
		</p>

		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			{#if 'href' in config.primary}
				<a
					href={config.primary.href}
					class="rounded-xl bg-brand px-7 py-3 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
				>
					{config.primary.label}
				</a>
			{:else}
				<button
					onclick={() => location.reload()}
					class="rounded-xl bg-brand px-7 py-3 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
				>
					{config.primary.label}
				</button>
			{/if}

			{#if 'href' in config.secondary}
				<a
					href={config.secondary.href}
					class="rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary"
				>
					{config.secondary.label}
				</a>
			{:else if config.secondary.action === 'reload'}
				<button
					onclick={() => location.reload()}
					class="rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary"
				>
					{config.secondary.label}
				</button>
			{:else}
				<button
					onclick={() => history.back()}
					class="rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary"
				>
					{config.secondary.label}
				</button>
			{/if}
		</div>
	</div>
</div>
