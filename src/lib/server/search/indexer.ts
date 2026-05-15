import { blogPost, comment, item, user } from '$lib/server/db/schema'
import { createD1SearchAdapter } from '$lib/server/search/adapter-d1'
import type { DrizzleDb } from '$lib/server/services/types'
import { eq, isNull } from 'drizzle-orm'

import type { SearchDocument } from './types'

function getAdapter(db: DrizzleDb) {
  // Drizzle D1 driver exposes all/run compatible with adapter's expected interface
  return createD1SearchAdapter(db as unknown as Parameters<typeof createD1SearchAdapter>[0])
}

export async function indexBlogPost(db: DrizzleDb, postId: string): Promise<void> {
  const rows = await db
    .select({
      contentBody: blogPost.contentBody,
      excerpt: blogPost.excerpt,
      id: blogPost.id,
      slug: blogPost.slug,
      status: blogPost.status,
      title: blogPost.title,
    })
    .from(blogPost)
    .where(eq(blogPost.id, postId))
    .limit(1)

  const post = rows[0] as
    | {
        contentBody: string | null
        excerpt: string | null
        id: string
        slug: string
        status: string
        title: string | null
      }
    | undefined
  if (!post) return

  // Don't index deleted or archived posts
  if (post.status === 'archived') return

  const document: SearchDocument = {
    content: [post.excerpt ?? '', post.contentBody ?? ''].join('\n').slice(0, 5000),
    entityId: post.id,
    entityType: 'blog_post',
    metadata: { slug: post.slug, status: post.status },
    title: post.title ?? post.slug,
  }

  await getAdapter(db).index(document)
}

export async function indexItem(db: DrizzleDb, itemId: string): Promise<void> {
  const rows = await db
    .select({
      createdAt: item.createdAt,
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
    })
    .from(item)
    .where(eq(item.id, itemId))
    .limit(1)

  const row = rows[0] as
    | { createdAt: Date; description: string | null; id: string; name: string; status: string }
    | undefined
  if (!row) return

  if (row.status === 'archived') return

  const document: SearchDocument = {
    content: row.description ?? '',
    entityId: row.id,
    entityType: 'item',
    metadata: { status: row.status },
    title: row.name,
  }

  await getAdapter(db).index(document)
}

export async function deindexEntity(
  db: DrizzleDb,
  entityId: string,
  entityType: string
): Promise<void> {
  await getAdapter(db).delete(entityId, entityType)
}

export async function reindexAllBlogPosts(db: DrizzleDb): Promise<number> {
  const posts = await db
    .select({
      contentBody: blogPost.contentBody,
      excerpt: blogPost.excerpt,
      id: blogPost.id,
      slug: blogPost.slug,
      status: blogPost.status,
      title: blogPost.title,
    })
    .from(blogPost)
    .where(isNull(blogPost.deletedAt))

  let indexedCount = 0
  for (const post of posts) {
    if (post.status !== 'archived') {
      const document: SearchDocument = {
        content: [post.excerpt ?? '', post.contentBody ?? ''].join('\n').slice(0, 5000),
        entityId: post.id,
        entityType: 'blog_post',
        metadata: { slug: post.slug, status: post.status },
        title: post.title ?? post.slug,
      }
      // oxlint-disable-next-line no-await-in-loop
      await getAdapter(db).index(document)
      indexedCount++
    }
  }
  return indexedCount
}

export async function reindexAllItems(db: DrizzleDb): Promise<number> {
  const items = await db
    .select({
      description: item.description,
      id: item.id,
      name: item.name,
      status: item.status,
    })
    .from(item)
    .where(isNull(item.deletedAt))

  let count = 0
  for (const row of items) {
    if (row.status !== 'archived') {
      const document: SearchDocument = {
        content: row.description ?? '',
        entityId: row.id,
        entityType: 'item',
        metadata: { status: row.status },
        title: row.name,
      }
      // oxlint-disable-next-line no-await-in-loop
      await getAdapter(db).index(document)
      count++
    }
  }
  return count
}

export async function indexUser(db: DrizzleDb, userId: string): Promise<void> {
  const rows = await db
    .select({
      bio: user.bio,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const row = rows[0] as
    | {
        bio: string | null
        displayName: string | null
        email: string
        id: string
        name: string | null
      }
    | undefined
  if (!row) return

  const document: SearchDocument = {
    content: [row.displayName ?? '', row.name ?? '', row.email, row.bio ?? ''].join('\n'),
    entityId: row.id,
    entityType: 'user',
    metadata: { email: row.email },
    title: row.displayName ?? row.name ?? row.email,
  }

  await getAdapter(db).index(document)
}

export async function reindexAllUsers(db: DrizzleDb): Promise<number> {
  const users = await db
    .select({
      bio: user.bio,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      name: user.name,
    })
    .from(user)

  let count = 0
  for (const row of users) {
    const document: SearchDocument = {
      content: [row.displayName ?? '', row.name ?? '', row.email, row.bio ?? ''].join('\n'),
      entityId: row.id,
      entityType: 'user',
      metadata: { email: row.email },
      title: row.displayName ?? row.name ?? row.email,
    }
    // oxlint-disable-next-line no-await-in-loop
    await getAdapter(db).index(document)
    count++
  }
  return count
}

export async function indexComment(db: DrizzleDb, commentId: string): Promise<void> {
  const rows = await db
    .select({
      authorId: comment.authorId,
      content: comment.content,
      id: comment.id,
      postId: comment.postId,
      status: comment.status,
    })
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1)

  const row = rows[0] as
    | { authorId: string; content: string; id: string; postId: string; status: string }
    | undefined
  if (!row) return

  // Only index approved comments
  if (row.status !== 'approved') return

  const document: SearchDocument = {
    content: row.content.slice(0, 3000),
    entityId: row.id,
    entityType: 'comment',
    metadata: { authorId: row.authorId, postId: row.postId, status: row.status },
    title: row.content.slice(0, 100),
  }

  await getAdapter(db).index(document)
}

export async function reindexAllComments(db: DrizzleDb): Promise<number> {
  const comments = await db
    .select({
      authorId: comment.authorId,
      content: comment.content,
      id: comment.id,
      postId: comment.postId,
      status: comment.status,
    })
    .from(comment)
    .where(eq(comment.status, 'approved'))

  let count = 0
  for (const row of comments) {
    const document: SearchDocument = {
      content: row.content.slice(0, 3000),
      entityId: row.id,
      entityType: 'comment',
      metadata: { authorId: row.authorId, postId: row.postId, status: row.status },
      title: row.content.slice(0, 100),
    }
    // oxlint-disable-next-line no-await-in-loop
    await getAdapter(db).index(document)
    count++
  }
  return count
}
