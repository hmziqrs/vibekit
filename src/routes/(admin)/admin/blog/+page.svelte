<script lang="ts">
	let { data } = $props()
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold text-text-primary">Blog Posts</h1>
	<a
		href="/admin/blog/new"
		class="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
	>
		New Post
	</a>
</div>

<div class="mt-8 space-y-3">
	{#if data.posts.length === 0}
		<p class="text-text-muted">No posts yet. Create your first post!</p>
	{:else}
		{#each data.posts as post}
			<div class="flex items-center justify-between rounded-xl border border-white/[0.06] bg-surface px-5 py-4">
				<div class="min-w-0 flex-1">
					<h3 class="truncate text-[15px] font-medium text-text-primary">{post.title}</h3>
					<div class="mt-1 flex items-center gap-3 text-[12px] text-text-subtle">
						<span>/blog/{post.slug}</span>
						<span>{new Date(post.createdAt).toLocaleDateString()}</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium
						{post.status === 'published' ? 'bg-green-500/10 text-green-400' : post.status === 'draft' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}">
						{post.status}
					</span>
					<a
						href="/admin/blog/{post.id}/edit"
						class="text-[12px] font-medium text-text-muted transition-colors hover:text-text-primary"
					>
						Edit
					</a>
				</div>
			</div>
		{/each}
	{/if}
</div>
