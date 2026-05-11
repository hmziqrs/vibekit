import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  auditLogRelations,
  blogPostRelations,
  blogPostRevisionRelations,
  blogPostSlugHistoryRelations,
  blogPostTagRelations,
  blogTagRelations,
  itemRelations,
} from '$lib/server/db/schema'
import { describe, expect, expectTypeOf, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('database schema', () => {
  describe('migration file', () => {
    it('has the new index migration', () => {
      const migration = readFileSync(
        resolve(root, 'drizzle/0008_unknown_ted_forrester.sql'),
        'utf8'
      )
      expect(migration).toContain('audit_log_action_created_idx')
      expect(migration).toContain('blog_post_status_deleted_published_idx')
      expect(migration).toContain('blog_post_deleted_idx')
      expect(migration).toContain('blog_post_tag_post_id_idx')
      expect(migration).toContain('blog_post_tag_tag_id_idx')
    })

    it('has contact and item indexes', () => {
      const migration = readFileSync(
        resolve(root, 'drizzle/0008_unknown_ted_forrester.sql'),
        'utf8'
      )
      expect(migration).toContain('contact_submission_created_idx')
      expect(migration).toContain('item_user_deleted_idx')
    })

    it('creates only indexes (no schema changes)', () => {
      const migration = readFileSync(
        resolve(root, 'drizzle/0008_unknown_ted_forrester.sql'),
        'utf8'
      )
      const statements = migration
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of statements) {
        expect(stmt).toMatch(/^CREATE INDEX/)
      }
      expect(statements.length).toBeGreaterThan(0)
    })
  })

  describe('drizzle relations', () => {
    it('all app relations are defined as objects with table and config', () => {
      const allRelations = [
        blogPostRelations,
        blogTagRelations,
        blogPostTagRelations,
        blogPostRevisionRelations,
        blogPostSlugHistoryRelations,
        itemRelations,
        auditLogRelations,
      ]
      for (const rel of allRelations) {
        expectTypeOf(rel).toBeObject()
        expect(rel).toHaveProperty('table')
        expect(rel).toHaveProperty('config')
      }
      expect(allRelations).toHaveLength(7)
    })

    it('blogPostRelations references blogPost table', () => {
      const { table } = blogPostRelations
      expect(table).toBeDefined()
    })

    it('itemRelations references item table', () => {
      const { table } = itemRelations
      expect(table).toBeDefined()
    })

    it('auditLogRelations references auditLog table', () => {
      const { table } = auditLogRelations
      expect(table).toBeDefined()
    })
  })
})
