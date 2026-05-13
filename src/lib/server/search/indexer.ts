import { blogPost, item } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { createD1SearchAdapter } from '$lib/server/search/adapter-d1'
import { eq, isNull } from 'drizzle-orm'

import type { SearchDocument } from './types'

type DbClient = AppDb & {
  all: (query: unknown) => Promise<unknown[]>
  run: (query: unknown) => Promise<void>
}

function getAdapter(db: DbClient) {
  return createD1SearchAdapter(db)
}

export async function indexBlogPost(db: DbClient, postId: string): Promise<void> {
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

export async function indexItem(db: DbClient, itemId: string): Promise<void> {
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
  db: DbClient,
  entityId: string,
  entityType: string
): Promise<void> {
  await getAdapter(db).delete(entityId, entityType)
}

export async function reindexAllBlogPosts(db: DbClient): Promise<number> {
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

  let count = 0
  for (const post of posts) {
    if (post.status === 'archived') continue

    const document: SearchDocument = {
      content: [post.excerpt ?? '', post.contentBody ?? ''].join('\n').slice(0, 5000),
      entityId: post.id,
      entityType: 'blog_post',
      metadata: { slug: post.slug, status: post.status },
      title: post.title ?? post.slug,
    }
    await getAdapter(db).index(document)
    count++
  }
  return count
}

export async function reindexAllItems(db: DbClient): Promise<number> {
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
    if (row.status === 'archived') continue

    const document: SearchDocument = {
      content: row.description ?? '',
      entityId: row.id,
      entityType: 'item',
      metadata: { status: row.status },
      title: row.name,
    }
    await getAdapter(db).index(document)
    count++
  }
  return count
}
