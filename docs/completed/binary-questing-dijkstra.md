# Cross-Navigation + Admin Blog Sort Filters

## Context

Two problems:

1. **No cross-navigation** — After login, users land on `/app/dashboard`. There's no link to reach `/admin/*` from the app sidebar, and no link to reach `/app/*` from the admin sidebar. The public nav dropdown only links to `/app` and `/app/settings`. Users must manually type URLs to switch between app and admin.

2. **No visible sort filters on admin blog** — The admin blog list has sortable column headers (click to sort) but no obvious sort indicator or dedicated sort dropdown. The sort is purely via column header clicks which isn't discoverable enough.

---

## Step 1 — Add admin link to app sidebar

**Modify:** `src/routes/(app)/+layout.svelte`

Add an "Admin" nav item to the `navItems` array when `auth.isAdmin` is true:

```ts
const navItems = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/items', label: 'Items' },
  { href: '/app/profile', label: 'Profile' },
  { href: '/app/settings', label: 'Settings' },
]

// Conditionally add admin link (rendered below with a separator)
```

Add the admin link below the main nav, separated by a divider, only when `auth.user?.role === 'admin'`. This matches the admin sidebar pattern that shows role badges. The link should go to `/admin/dashboard` and have a subtle "Admin" label with a shield/key icon.

The link will be placed after the main nav items with a border-t separator, so it's visually distinct as a cross-section navigation item rather than a regular app page.

## Step 2 — Add app link to admin sidebar

**Modify:** `src/routes/(admin)/+layout.svelte`

Add a "Back to App" link in the admin sidebar, placed above the divider at the bottom (before user info). Links to `/app/dashboard`. Uses a subtle text style like the other sidebar links.

## Step 3 — Add admin link to public nav dropdown

**Modify:** `src/lib/components/nav.svelte`

In the logged-in user dropdown, add an "Admin" link (only when `auth.user?.role === 'admin'`) between "Settings" and the logout divider. This lets admins reach the admin panel from any public page (blog, features, etc.).

## Step 4 — Improve admin blog sort discoverability

**Modify:** `src/routes/(admin)/admin/blog/+page.svelte`

The DataTable column headers already have clickable sort with arrow icons. The issue is purely discoverability. Add a small "Sort by" dropdown/selector above the table (next to the search input) that lets users pick sort field + direction from a dropdown, as an alternative to clicking column headers. This dropdown syncs with `sortKey` and `sortDir` state.

Options:

- Title (A-Z / Z-A)
- Created (Newest / Oldest)
- Published (Newest / Oldest)
- Status

---

## Files Summary

| File                                         | Changes                                                |
| -------------------------------------------- | ------------------------------------------------------ |
| `src/routes/(app)/+layout.svelte`            | Add conditional "Admin" link with separator in sidebar |
| `src/routes/(admin)/+layout.svelte`          | Add "Back to App" link in sidebar footer area          |
| `src/lib/components/nav.svelte`              | Add conditional "Admin" link in user dropdown          |
| `src/routes/(admin)/admin/blog/+page.svelte` | Add sort-by dropdown next to search                    |

## Verification

- Log in as admin → app sidebar shows "Admin" link → click → goes to `/admin/dashboard`
- Admin sidebar shows "Back to App" link → click → goes to `/app/dashboard`
- Public nav dropdown (when admin logged in) shows "Admin" option
- Admin blog list: sort dropdown is visible, changing it sorts the table, and it stays in sync with column header clicks
- Log in as normal user → app sidebar does NOT show "Admin" link → public nav dropdown does NOT show "Admin"
