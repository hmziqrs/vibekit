# CI/CD Pipeline — Implementation Plan

## What exists

- lint (oxlint), format (oxfmt), type-check (svelte-check), test (vitest) scripts
- Wrangler for Cloudflare deployment
- build script for production

## What's needed

1. GitHub Actions workflow for CI (lint, typecheck, test, build)
2. Preview deploy on PR (wrangler pages deploy --preview)
3. Production deploy on merge to main
4. Branch protection rules documentation

## Files to Create

1. `.github/workflows/ci.yml` — CI pipeline
2. `.github/workflows/deploy.yml` — CD pipeline
