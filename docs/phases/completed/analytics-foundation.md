# Analytics Foundation — Implementation Plan

## What exists

- Firebase Analytics integration (useAnalytics hook)
- Consent banner component (src/lib/components/consent-banner.svelte)
- Cloudflare Web Analytics beacon component

## What's been done

- Event tracking architecture: Firebase Analytics with consent check
- Privacy-first: consent banner shown before any tracking
- Do Not Track respected via consent banner logic
- IP anonymization configured in Firebase
