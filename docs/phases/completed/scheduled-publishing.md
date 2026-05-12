# Scheduled Publishing

## Status: Complete

## Current State

- `blogPost.status` enum: `'draft' | 'published' | 'archived'` — no `'scheduled'`
- `blogPost.publishedAt` set to "now" at publish time, no `scheduledAt` field
- Publish button immediately publishes (no scheduling option)
- Cron trigger: `["0 3 * * *"]` (daily at 3 AM UTC), cleanup endpoint at `/api/admin/cleanup`
- Worker has no `scheduled` handler — cron likely calls cleanup via HTTP fetch

## Changes Required

1. **Schema**: Add `'scheduled'` to status enum, add `scheduledAt` (nullable timestamp_ms) field
2. **Migration**: Generate Drizzle migration for new field and enum expansion
3. **Validators**: Add `'scheduled'` to status enums, add `scheduledAt` optional field
4. **API**: Update `PATCH /:id` to accept scheduling; add `/api/admin/publish-scheduled` cron endpoint
5. **Cron**: Add `*/5 * * * *` trigger for scheduled publishing (every 5 min)
6. **Editor UI**: Add date/time picker, "Schedule" button alongside "Publish"
7. **Blog list UI**: Add "Scheduled" filter tab
8. **Status badge**: Add `scheduled` variant with distinct color
9. **Public pages**: No changes (already filter by `status = 'published'`)

## Files to Modify

- `src/lib/server/db/schema.ts` — Add scheduledAt field, expand status enum
- `src/lib/validators/blog.ts` — Add scheduled status, scheduledAt field
- `src/lib/server/hono/index.ts` — Update publish/schedule endpoints, add cron endpoint
- `wrangler.jsonc` — Add more frequent cron trigger
- `src/routes/(admin)/admin/blog/[id]/edit/+page.svelte` — Schedule UI
- `src/routes/(admin)/admin/blog/+page.svelte` — Scheduled tab in list
