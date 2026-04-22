import { uuid } from '../src/lib/server/uuid'

const TAGS = [
  { name: 'SvelteKit', slug: 'sveltekit' },
  { name: 'Cloudflare', slug: 'cloudflare' },
  { name: 'Authentication', slug: 'authentication' },
  { name: 'Drizzle ORM', slug: 'drizzle-orm' },
  { name: 'Edge Computing', slug: 'edge-computing' },
]

const POST_TAGS: Record<string, string[]> = {
  'getting-started-with-sveltekit-2': ['sveltekit', 'cloudflare'],
  'building-saas-on-cloudflare-workers': ['cloudflare', 'edge-computing'],
  'authentication-best-practices-sveltekit': ['authentication', 'sveltekit'],
  'drizzle-orm-d1-type-safe-queries': ['drizzle-orm', 'cloudflare'],
  'future-of-edge-computing-web-developers': ['edge-computing', 'cloudflare'],
}

function esc(s: string) {
  return s.replace(/'/g, "''")
}

const POSTS = [
  {
    title: 'Getting Started with SvelteKit 2',
    slug: 'getting-started-with-sveltekit-2',
    excerpt:
      'A comprehensive guide to building modern web applications with SvelteKit 2, from project setup to deployment on Cloudflare Workers.',
    contentBody: `## Why SvelteKit 2?

SvelteKit 2 brings significant improvements over its predecessor, including better performance, enhanced developer experience, and first-class support for edge runtimes like Cloudflare Workers.

## Setting Up Your Project

Start by creating a new SvelteKit project:

\`\`\`bash
npx sv create my-app
cd my-app
npm install
\`\`\`

## Project Structure

SvelteKit uses a file-based routing system. Your route files live in \`src/routes/\`:

- \`+page.svelte\` — UI component for a route
- \`+page.ts\` — client-side data loading
- \`+page.server.ts\` — server-side data loading
- \`+server.ts\` — API endpoints

## Loading Data

SvelteKit provides powerful data loading through \`load\` functions:

\`\`\`typescript
// src/routes/+page.server.ts
export async function load({ platform }) {
  const db = platform.env.DB
  const posts = await db.prepare('SELECT * FROM posts').all()
  return { posts: posts.results }
}
\`\`\`

## Deploying to Cloudflare

With the \`@sveltejs/adapter-cloudflare\` adapter, deployment is seamless:

\`\`\`bash
npm run build
wrangler deploy
\`\`\`

Your app runs on Cloudflare's global network with sub-millisecond cold starts.

## Next Steps

- Explore SvelteKit's form actions for mutations
- Set up authentication with Better Auth
- Use Drizzle ORM for type-safe database queries
- Add TanStack Query for client-side data management`,
    seoTitle: 'Getting Started with SvelteKit 2 — Vibekit',
    seoDescription:
      'Learn how to build modern web applications with SvelteKit 2 and deploy to Cloudflare Workers.',
    status: 'published',
  },
  {
    title: 'Building a SaaS Product on Cloudflare Workers',
    slug: 'building-saas-on-cloudflare-workers',
    excerpt:
      'How to leverage Cloudflare\'s edge platform to build fast, globally distributed SaaS applications with minimal infrastructure overhead.',
    contentBody: `## The Edge Computing Advantage

Cloudflare Workers run your code in 300+ cities worldwide. For SaaS products, this means your users get sub-50ms response times regardless of their location.

## Key Cloudflare Services for SaaS

### D1 — SQLite at the Edge

D1 provides SQLite databases that replicate globally. Combined with Drizzle ORM, you get type-safe queries:

\`\`\`typescript
const users = await db.select().from(user).where(eq(user.email, email))
\`\`\`

### R2 — Object Storage

Store and serve files without egress fees. Perfect for user uploads, media, and documents.

### Workers — Compute

Your application logic runs on Cloudflare's network. No cold starts, no scaling concerns.

## Architecture Overview

A typical SaaS stack on Cloudflare:

1. **SvelteKit** — Full-stack framework
2. **D1 + Drizzle** — Database
3. **R2** — File storage
4. **Better Auth** — Authentication
5. **Workers** — Compute

## Cost Efficiency

Cloudflare's free tier handles surprising scale:
- 100,000 Workers requests/day
- 5 million D1 reads/day
- 10 million R2 Class A operations/month

For most early-stage SaaS products, this means **$0 infrastructure costs** while you find product-market fit.`,
    seoTitle: 'Building SaaS on Cloudflare Workers',
    seoDescription:
      'Discover how to build globally distributed SaaS applications using Cloudflare Workers, D1, and R2.',
    status: 'published',
  },
  {
    title: 'Authentication Best Practices for SvelteKit Apps',
    slug: 'authentication-best-practices-sveltekit',
    excerpt:
      'A deep dive into implementing secure authentication in SvelteKit using Better Auth, with patterns for session management, route guards, and role-based access.',
    contentBody: `## Why Better Auth?

Better Auth is a framework-agnostic authentication library that works natively with SvelteKit. It provides:

- Email/password authentication
- Session management
- Role-based access control
- Email verification flows
- Password reset

## Setting Up Better Auth

Better Auth uses a factory pattern because D1 is only available per-request in Cloudflare Workers:

\`\`\`typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export function createAuth(d1: D1Database) {
  return betterAuth({
    database: drizzleAdapter(db),
    emailAndPassword: { enabled: true },
  })
}
\`\`\`

## Session Management

Sessions are resolved in \`hooks.server.ts\` and attached to \`event.locals\`:

\`\`\`typescript
const session = await auth.api.getSession({ headers: event.request.headers })
if (session) {
  event.locals.user = session.user
  event.locals.session = session.session
}
\`\`\`

## Route Guards

Protect routes in your handle chain:

\`\`\`typescript
if (pathname.startsWith('/admin')) {
  if (!user) return redirect(302, '/login')
  if (user.role !== 'admin') throw error(403)
}
\`\`\`

## Email Verification

Configure Better Auth to require email verification:

\`\`\`typescript
emailVerification: {
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
}
\`\`\`

This ensures users confirm their email before accessing sensitive features.`,
    seoTitle: 'SvelteKit Authentication Best Practices',
    seoDescription:
      'Learn how to implement secure authentication in SvelteKit with Better Auth, including session management and role-based access.',
    status: 'published',
  },
  {
    title: 'Type-Safe Database Queries with Drizzle ORM and D1',
    slug: 'drizzle-orm-d1-type-safe-queries',
    excerpt:
      'How Drizzle ORM brings SQL-like type safety to Cloudflare D1, with practical examples of schema definition, migrations, and queries.',
    contentBody: `## What is Drizzle ORM?

Drizzle is a TypeScript ORM that gives you SQL-like syntax with full type safety. Unlike heavy ORMs, Drizzle generates minimal, readable queries.

## Schema Definition

Define your tables with full TypeScript types:

\`\`\`typescript
export const blogPost = sqliteTable('blog_post', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['draft', 'published'] }).default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})
\`\`\`

## Queries

Drizzle queries are type-safe and SQL-like:

\`\`\`typescript
// Select published posts
const posts = await db
  .select()
  .from(blogPost)
  .where(and(
    eq(blogPost.status, 'published'),
    isNull(blogPost.deletedAt)
  ))
  .orderBy(desc(blogPost.publishedAt))

// Insert
await db.insert(blogPost).values({
  id: uuid(),
  title: 'My Post',
  slug: 'my-post',
  authorId: userId,
})

// Update
await db
  .update(blogPost)
  .set({ status: 'published', publishedAt: new Date() })
  .where(eq(blogPost.id, postId))
\`\`\`

## Migrations

Drizzle Kit generates SQL migrations from schema changes:

\`\`\`bash
bun db:generate    # Generate migration SQL
bun db:push:local  # Apply to local D1
\`\`\`

## Relations

Define relations for join queries:

\`\`\`typescript
export const blogPostRelations = relations(blogPost, ({ one }) => ({
  author: one(user, { fields: [blogPost.authorId], references: [user.id] }),
}))
\`\`\`

This enables eager loading: \`db.query.blogPost.findMany({ with: { author: true } })\``,
    seoTitle: 'Drizzle ORM with Cloudflare D1',
    seoDescription:
      'Master type-safe database queries with Drizzle ORM and Cloudflare D1 SQLite.',
    status: 'published',
  },
  {
    title: 'The Future of Edge Computing for Web Developers',
    slug: 'future-of-edge-computing-web-developers',
    excerpt:
      'Exploring how edge computing is reshaping web development and what it means for building the next generation of applications.',
    contentBody: `## What is Edge Computing?

Edge computing runs your code closer to your users. Instead of a single data center, your application runs in hundreds of locations worldwide.

## Benefits for Web Developers

### Performance

Traditional: User in Tokyo → Request to US East server → 200ms latency

Edge: User in Tokyo → Request to Tokyo server → 20ms latency

### Reliability

Edge platforms distribute load across hundreds of locations. A single data center outage doesn't take down your application.

### Developer Experience

Modern edge platforms support the tools you already know:

- **JavaScript/TypeScript** — Workers run standard JS
- **SQL** — D1 gives you SQLite at the edge
- **Key-value storage** — KV for global, low-latency reads
- **Object storage** — R2 for files without egress fees

## Challenges

Edge computing isn't without trade-offs:

1. **Eventual consistency** — Data replication has a small delay
2. **Compute limits** — Workers have CPU time limits (but they're generous)
3. **Cold starts** — Minimal with Workers (sub-millisecond)

## Getting Started

The easiest way to start is with SvelteKit + Cloudflare:

1. Create a SvelteKit app
2. Add the Cloudflare adapter
3. Deploy with Wrangler

Your app is instantly global.

## What's Next?

As edge computing matures, expect:
- More database options at the edge
- Better tooling for local development
- Increased compute limits
- Stronger consistency guarantees

The future is edge-native. Start building today.`,
    status: 'draft',
  },
]

function sqlValue(v: string | null | undefined) {
  if (v == null) return 'NULL'
  return `'${esc(v)}'`
}

function generateSql(): string[] {
  const lines: string[] = []

  // Ensure a seed user exists for author_id fallback
  const seedUserId = uuid()
  lines.push(
    `INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at, display_name, role, status) VALUES ('${seedUserId}', 'Seed Author', 'seed@vibekit.local', 1, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer), 'Seed Author', 'admin', 'active');`,
  )

  const tagIds: Record<string, string> = {}
  for (const tag of TAGS) {
    const id = uuid()
    tagIds[tag.slug] = id
    lines.push(
      `INSERT OR IGNORE INTO blog_tag (id, name, slug, created_at) VALUES ('${id}', '${esc(tag.name)}', '${esc(tag.slug)}', cast(unixepoch('subsecond') * 1000 as integer));`,
    )
  }

  const postIds: Record<string, string> = {}
  for (const post of POSTS) {
    const id = uuid()
    postIds[post.slug] = id
    const body = esc(post.contentBody)
    const excerpt = esc(post.excerpt || '')
    const title = esc(post.title)
    const seoTitle = post.seoTitle ? `'${esc(post.seoTitle)}'` : 'NULL'
    const seoDesc = post.seoDescription ? `'${esc(post.seoDescription)}'` : 'NULL'
    const publishedAt = post.status === 'published' ? "cast(unixepoch('subsecond') * 1000 as integer)" : 'NULL'

    lines.push(
      `INSERT OR IGNORE INTO blog_post (id, title, slug, excerpt, content_body, seo_title, seo_description, status, author_id, published_at, created_at, updated_at) VALUES ('${id}', '${title}', '${post.slug}', '${excerpt}', '${body}', ${seoTitle}, ${seoDesc}, '${post.status}', COALESCE((SELECT id FROM user WHERE email = 'seed@vibekit.local' LIMIT 1), (SELECT id FROM user LIMIT 1)), ${publishedAt}, cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer));`,
    )
  }

  for (const [slug, tagSlugs] of Object.entries(POST_TAGS)) {
    const postId = postIds[slug]
    if (!postId) continue
    for (const tagSlug of tagSlugs) {
      const tagId = tagIds[tagSlug]
      if (!tagId) continue
      lines.push(
        `INSERT OR IGNORE INTO blog_post_tag (post_id, tag_id) VALUES ('${postId}', '${tagId}');`,
      )
    }
  }

  return lines
}

async function writeSql(outPath: string) {
  const fs = await import('fs')
  const lines = generateSql()
  fs.writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`Wrote ${lines.length} SQL statements to ${outPath}`)
}

async function runWrangler(filePath: string) {
  const { spawn } = await import('child_process')
  const exitCode = await new Promise<number>((resolve) => {
    const proc = spawn('npx', ['wrangler', 'd1', 'execute', 'vibekit-db', '--local', '--file', filePath], {
      stdio: 'inherit',
      shell: false,
    })
    proc.on('close', resolve)
  })
  if (exitCode !== 0) {
    throw new Error(`wrangler d1 execute exited with code ${exitCode}`)
  }
}

async function cleanSeed() {
  const lines: string[] = []
  for (const slug of POSTS.map((p) => p.slug)) {
    lines.push(`DELETE FROM blog_post_tag WHERE post_id IN (SELECT id FROM blog_post WHERE slug = '${esc(slug)}');`)
    lines.push(`DELETE FROM blog_post WHERE slug = '${esc(slug)}';`)
  }
  for (const tag of TAGS) {
    lines.push(`DELETE FROM blog_tag WHERE slug = '${esc(tag.slug)}';`)
  }
  lines.push(`DELETE FROM user WHERE email = 'seed@vibekit.local';`)
  const outPath = 'scripts/clean-blog.sql'
  const fs = await import('fs')
  fs.writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`Wrote ${lines.length} clean statements to ${outPath}`)
  console.log('Executing clean via wrangler...')
  await runWrangler(outPath)
  console.log('Clean complete.')
}

async function main() {
  const mode = process.argv[2]

  if (mode === 'sql') {
    const outPath = process.argv[3] || 'scripts/seed-blog.sql'
    await writeSql(outPath)
    console.log('Run with: npx wrangler d1 execute vibekit-db --local --file ' + outPath)
    return
  }

  if (mode === 'seed') {
    // Clean first to avoid FK conflicts when posts already exist with different UUIDs
    console.log('Cleaning existing seed data...')
    await cleanSeed()
    const outPath = 'scripts/seed-blog.sql'
    await writeSql(outPath)
    console.log('Executing seed via wrangler...')
    await runWrangler(outPath)
    console.log('Seed complete.')
    return
  }

  if (mode === 'clean') {
    await cleanSeed()
    return
  }

  console.log(`Usage: bun scripts/seed-blog.ts <mode>`)
  console.log('')
  console.log('Modes:')
  console.log('  sql    - Generate seed SQL file')
  console.log('  seed   - Generate and execute seed SQL against local D1')
  console.log('  clean  - Remove seeded posts, tags, and seed user from local D1')
  console.log('')
  console.log(`Posts defined: ${POSTS.length}`)
  for (const post of POSTS) {
    console.log(`  ${post.status === 'published' ? '✓' : '○'} ${post.title}`)
  }
}

main().catch(console.error)
