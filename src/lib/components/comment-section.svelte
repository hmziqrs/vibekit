<script lang="ts">
  import { getContext } from 'svelte'
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import type { AuthContext } from '$lib/auth.svelte'

  let { postId } = $props()

  const auth = getContext<AuthContext>('auth')
  const queryClient = useQueryClient()

  let newComment = $state('')
  let replyTo = $state<string | null>(null)
  let replyContent = $state('')
  let submitting = $state(false)
  let error = $state('')

  const commentsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch(`/api/comments/${postId}`)
      if (!res.ok) throw new Error('Failed to load comments')
      return (await res.json()) as {
        comments: CommentWithReplies[]
        page: number
        total: number
      }
    },
    queryKey: ['comments', postId],
    retry: 1,
  }))

  interface CommentAuthor {
    authorDisplayName: string | null
    authorId: string
    authorImage: string | null
    authorName: string
  }

  interface CommentData extends CommentAuthor {
    content: string
    createdAt: Date
    editedAt: Date | null
    htmlContent: string | null
    id: string
    replyCount?: number
  }

  interface CommentWithReplies extends CommentData {
    replies: CommentData[]
  }

  const commentMutation = createMutation(() => ({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await fetch(`/api/comments/${postId}`, {
        body: JSON.stringify({ content, parentId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? 'Failed to post comment')
      }
      return res.json()
    },
    onError: (err: Error) => {
      error = err.message
    },
    onSuccess: () => {
      newComment = ''
      replyTo = null
      replyContent = ''
      error = ''
      commentsQuery.refetch()
    },
  }))

  function handleSubmit() {
    if (!auth.user) return
    submitting = true
    error = ''
    commentMutation.mutate({ content: newComment })
    submitting = false
  }

  function handleReply(parentId: string) {
    if (!auth.user) return
    if (!replyContent.trim()) return
    commentMutation.mutate({ content: replyContent, parentId })
  }

  function cancelReply() {
    replyTo = null
    replyContent = ''
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function canModerate(): boolean {
    return auth.isAdmin
  }
</script>

{#if commentsQuery.data || commentsQuery.isPending}
  <section class="mt-12 border-t border-border pt-8">
    <h2 class="mb-6 text-xl font-semibold text-text-primary">
      Comments
      {#if commentsQuery.data}
        <span class="text-sm font-normal text-text-muted">({commentsQuery.data.total})</span>
      {/if}
    </h2>

    <!-- New comment form -->
    {#if auth.user}
      <form
        onsubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        class="mb-8"
      >
        <textarea
          bind:value={newComment}
          placeholder="Write a comment..."
          rows="3"
          class="w-full rounded-lg border border-border bg-input px-3 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          maxlength="5000"
        ></textarea>
        {#if error}
          <p class="mt-2 text-[12px] text-destructive">{error}</p>
        {/if}
        <div class="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || commentMutation.isPending}
            class="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover disabled:opacity-50"
          >
            {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    {:else}
      <div class="mb-8 rounded-lg border border-border bg-surface p-4 text-center">
        <p class="text-[13px] text-text-muted">
          <a href="/login" class="text-brand hover:underline">Sign in</a> to leave a comment.
        </p>
      </div>
    {/if}

    <!-- Comments list -->
    {#if commentsQuery.isPending}
      <div class="space-y-4">
        {#each Array(3) as _}
          <div class="animate-pulse rounded-lg border border-border bg-surface p-4">
            <div class="mb-2 h-4 w-24 rounded bg-muted"></div>
            <div class="h-3 w-full rounded bg-muted"></div>
          </div>
        {/each}
      </div>
    {:else if commentsQuery.data?.comments.length}
      <div class="space-y-4">
        {#each commentsQuery.data.comments as commentItem}
          <article class="rounded-lg border border-border bg-surface p-4">
            <div class="flex items-center gap-3">
              {#if commentItem.authorImage}
                <img
                  src={commentItem.authorImage}
                  alt={commentItem.authorName}
                  class="size-8 rounded-full"
                />
              {:else}
                <div
                  class="flex size-8 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold text-text-secondary"
                >
                  {commentItem.authorName.charAt(0).toUpperCase()}
                </div>
              {/if}
              <div>
                <span class="text-[13px] font-medium text-text-primary">
                  {commentItem.authorDisplayName ?? commentItem.authorName}
                </span>
                <span class="ml-2 text-[12px] text-text-faint">{formatDate(commentItem.createdAt)}</span>
                {#if commentItem.editedAt}
                  <span class="ml-1 text-[11px] text-text-faint">(edited)</span>
                {/if}
              </div>
            </div>
            <div class="mt-2 text-[13px] leading-relaxed text-text-secondary">
              {commentItem.content}
            </div>
            <div class="mt-2 flex items-center gap-3">
              {#if auth.user}
                <button
                  onclick={() => {
                    replyTo = replyTo === commentItem.id ? null : commentItem.id
                    replyContent = ''
                  }}
                  class="text-[12px] text-text-muted hover:text-text-primary"
                >
                  Reply
                </button>
              {/if}
            </div>

            <!-- Reply form -->
            {#if replyTo === commentItem.id}
              <form
                onsubmit={(e) => {
                  e.preventDefault()
                  handleReply(commentItem.id)
                }}
                class="mt-3 ml-4"
              >
                <textarea
                  bind:value={replyContent}
                  placeholder="Write a reply..."
                  rows="2"
                  class="w-full rounded-lg border border-border bg-input px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  maxlength="5000"
                ></textarea>
                <div class="mt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!replyContent.trim()}
                    class="rounded-lg bg-brand px-3 py-1 text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onclick={cancelReply}
                    class="text-[12px] text-text-muted hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            {/if}

            <!-- Replies -->
            {#if commentItem.replies?.length}
              <div class="mt-3 ml-4 space-y-3 border-l-2 border-border pl-4">
                {#each commentItem.replies as reply}
                  <div>
                    <div class="flex items-center gap-2">
                      {#if reply.authorImage}
                        <img
                          src={reply.authorImage}
                          alt={reply.authorName}
                          class="size-6 rounded-full"
                        />
                      {:else}
                        <div
                          class="flex size-6 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-semibold text-text-secondary"
                        >
                          {reply.authorName.charAt(0).toUpperCase()}
                        </div>
                      {/if}
                      <span class="text-[12px] font-medium text-text-primary">
                        {reply.authorDisplayName ?? reply.authorName}
                      </span>
                      <span class="text-[11px] text-text-faint">{formatDate(reply.createdAt)}</span>
                      {#if reply.editedAt}
                        <span class="text-[10px] text-text-faint">(edited)</span>
                      {/if}
                    </div>
                    <div class="mt-1 text-[12px] leading-relaxed text-text-secondary">
                      {reply.content}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <p class="text-[13px] text-text-muted">No comments yet. Be the first to comment!</p>
    {/if}
  </section>
{/if}
