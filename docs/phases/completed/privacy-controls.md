# Privacy Controls — Implementation Plan

## What exists

- Cookie consent banner
- Consent tracking in localStorage
- Privacy policy page
- Firebase Analytics with consent check

## What's been done

- Cookie consent management via consent-banner component
- Tracking opt-out: Firebase Analytics only fires after consent
- Data retention: soft delete pattern across all entities
- Privacy policy page with content
