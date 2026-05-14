import { blogPost, item } from '$lib/server/db/schema'
import { createD1SearchAdapter } from '$lib/server/search/adapter-d1'
import type { DrizzleDb } from '$lib/server/services/types'
import { eq, isNull } from 'drizzle-orm'

import type { SearchDocument } from './types'

function getAdapter(db: DrizzleDb) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createD1SearchAdapter(db as any)
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
