# User Data Export / Portability

## Overview

GDPR-compliant one-click data export that aggregates all user-owned data into a downloadable JSON file.

## Scope

### API Endpoint

- **`GET /api/account/export`** on `protectedApp` (Hono router)
- Rate-limited: 1 request per hour (`withRateLimit('data-export', 1, 3_600_000)`)
- Audit log entry: `account.export` action on each download
- Response: JSON file with `Content-Disposition: attachment` header

### Data Included (8 tables, secrets redacted)

| Table               | Fields Exported                                                                                                | Redacted                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `user`              | name, email, displayName, image, bio, role, status, timezone, createdAt, updatedAt, lastLoginAt, emailVerified | password hash (not in user table, but excluded from account), banExpiresAt, banReason |
| `account`           | providerId, accountId, createdAt                                                                               | accessToken, refreshToken, idToken, password                                          |
| `session`           | ipAddress, userAgent, createdAt, expiresAt                                                                     | token                                                                                 |
| `passkey`           | name, deviceType, aaguid, backedUp, createdAt                                                                  | publicKey, credentialID                                                               |
| `item`              | All fields (id, name, description, status, createdAt, updatedAt)                                               | deletedAt                                                                             |
| `auditLog`          | All fields (action, entityType, entityId, metadata, createdAt)                                                 | —                                                                                     |
| `securityEvent`     | eventType, ipAddress, userAgent, metadata, createdAt                                                           | —                                                                                     |
| `contactSubmission` | Only entries matching user's email: name, email, subject, message, type, createdAt                             | —                                                                                     |

### Data NOT Included (admin-only or non-user)

- `blogPost`, `blogPostRevision`, `blogPostTag`, `blogPostSlugHistory` — admin-only content
- `blogTag` — global
- `verification` — no direct user FK, transient tokens
- `loginAttempt` — keyed by email, not userId, internal security data

### Response Format

```json
{
  "exportedAt": "2026-05-12T...",
  "version": "1.0",
  "user": { ... },
  "accounts": [ ... ],
  "sessions": [ ... ],
  "passkeys": [ ... ],
  "items": [ ... ],
  "auditLog": [ ... ],
  "securityEvents": [ ... ],
  "contactSubmissions": [ ... ]
}
```

### UI Changes

- Add "Export Your Data" section to settings page (`src/routes/(app)/app/settings/+page.svelte`)
- Placed above the "Deactivate Account" section
- Description explaining what's included, link to privacy policy
- Button triggers `fetch('/api/account/export')` → blob download
- Loading state during download
- Rate limit error handling (shows message if hit limit)

### Privacy Policy Update

- Add "Data Portability" section to privacy page
- Mention right to export all personal data
- Reference the settings page export feature

### Files to Modify

1. `src/lib/server/hono/index.ts` — Add `GET /api/account/export` endpoint
2. `src/routes/(app)/app/settings/+page.svelte` — Add export section
3. `src/routes/(public)/privacy/+page.svelte` — Add data portability section

### Test Plan

**Unit tests** (`tests/unit/data-export.test.ts`):

- Export data shape validation (all expected keys present)
- Secret redaction verification (no tokens, passwords, keys in export)
- Date serialization correctness
- Empty data handling (user with no items/sessions)

**E2E tests** (`tests/e2e/data-export.spec.ts`):

- Export endpoint returns JSON with correct content-type
- Export includes user profile data
- Export respects authentication (401 for unauthenticated)
- Rate limiting works (429 on second request within window)
