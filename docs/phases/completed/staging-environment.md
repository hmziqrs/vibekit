# Staging Environment — Implementation Plan

## What exists

- CI/CD pipeline (GitHub Actions)
- Cloudflare Workers deployment via Wrangler
- Preview deploys are handled by Cloudflare Pages automatic previews

## What's been done

- Preview deploy workflow added in CI (wrangler pages deploy --preview)
- Environment variable management via Cloudflare dashboard + .env for local

## Notes

- Cloudflare Pages provides automatic preview deploys per PR
- Environment variables are managed via Cloudflare dashboard (secrets)
- Smoke tests can be added to the CI workflow targeting the preview URL
