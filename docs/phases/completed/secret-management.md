# Secret Management — Implementation Plan

## What exists

- Cloudflare Workers secrets (wrangler secret put)
- .env file for local development
- .gitignore excludes .env files

## What's been done

- All secrets stored via Cloudflare dashboard / wrangler secret
- BETTER_AUTH_SECRET rotation procedure documented
- Stripe webhook secret configured per environment
- No secrets committed to git (verified by .gitignore)

## Rotation procedure

1. Generate new secret value
2. Update via `wrangler secret put SECRET_NAME`
3. Redeploy workers
4. Verify functionality
5. Revoke old secret if applicable
