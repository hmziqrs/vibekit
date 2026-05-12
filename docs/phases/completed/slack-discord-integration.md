# Slack/Discord Integration — Implementation Plan

## What exists

- Webhook infrastructure (webhook_delivery table, retry logic, signing secrets)
- Integration table (Slack, Discord provider types)
- Admin integrations page (src/routes/(app)/app/settings/integrations/)
- Webhook delivery logs and management

## What's been done

- Webhook delivery system with retry logic and event types
- Integration CRUD via admin settings page
- Signing secret verification for webhook payloads
- Webhook delivery tracking and retry management
- Platform-agnostic webhook architecture supports Slack and Discord webhooks
- Event-driven notifications can be configured per integration
