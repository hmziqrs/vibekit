# Product Requirements Document (PRD)

## Framework-Agnostic SaaS Platform

**Status:** Draft v1
**Package Manager:** Bun
**Database:** SQLite
**ORM:** Drizzle ORM
**Authentication:** Better Auth
**UI System:** DaisyUI
**Framework Constraint:** Framework-agnostic for now; implementation details will later be specialized for TanStack Start and SvelteKit.

---

# 1. Executive Summary

This product is a full-stack SaaS platform with four major surfaces:

1. **Static marketing website** under `/`
2. **Blog** under `/blog/*` using ISR-style content regeneration
3. **Consumer application** under `/app/*` as CSR-only
4. **Administrative console** under `/admin/*` as CSR-only

The platform must support authentication, user management, blog publishing, protected application features, and internal administration. The public site should prioritize SEO, performance, and conversion. The application surfaces should prioritize responsiveness, correctness, access control, and developer maintainability.

This PRD is intentionally framework-agnostic. It defines product behavior, architecture constraints, routes, data model expectations, testing requirements, and delivery milestones without binding implementation to a specific rendering framework yet.

---

# 2. Product Goals

## 2.1 Primary Goals

* Build a production-ready SaaS platform with clear separation between public content and authenticated app surfaces.
* Support a static, SEO-friendly landing experience for marketing pages.
* Support dynamic blog publishing with ISR-style regeneration semantics.
* Support rich, client-rendered application experiences for end users and admins.
* Keep the architecture simple enough to ship quickly while preserving room for future growth.
* Standardize the stack around Bun, Drizzle ORM, SQLite, Better Auth, and DaisyUI.

## 2.2 Success Criteria

* Users can discover the product through the static website and blog.
* Users can register, log in, log out, and access protected app routes.
* Admins can manage users and blog content.
* Blog posts can be drafted, published, updated, and reflected on the public blog with regeneration behavior.
* The application and admin panels function entirely in CSR mode without SEO dependence.
* The codebase remains adaptable to later implementation in either TanStack Start or SvelteKit.

## 2.3 Non-Goals

* Native mobile apps
* Multi-region distributed databases
* Real-time collaborative editing in v1
* Enterprise RBAC beyond core roles in v1
* Multi-tenant billing complexity in v1 unless later added as a scoped phase
* Complex CMS features like version comparison, editorial workflow approvals, or scheduled publishing beyond a minimal schedule mechanism

---

# 3. Product Scope

## 3.1 Public Website Scope (`/`)

The public website is static-first and includes:

* Home page
* Features page
* Pricing page
* About page
* Contact page
* Legal pages (privacy policy, terms, cookie notice if needed)
* Navigation, footer, and CTA surfaces
* Lead capture forms or contact forms

## 3.2 Blog Scope (`/blog/*`)

The blog is public and SEO-oriented with ISR-style regeneration.

Includes:

* Blog index page
* Blog category/tag pages (optional in v1 but recommended)
* Blog detail page by slug
* Related posts section
* Author attribution
* SEO metadata
* Structured data support
* Draft/published states
* Regeneration after content updates

## 3.3 Consumer App Scope (`/app/*`)

The consumer app is CSR-only and includes:

* Authenticated dashboard
* User profile and settings
* Core product workflows
* Data views, forms, tables, filters, and actions
* Protected API/data interactions
* Session-aware UI

## 3.4 Admin Scope (`/admin/*`)

The admin area is CSR-only and includes:

* Admin login/session validation
* Admin dashboard
* User management
* Blog management
* Content publishing workflow
* Audit-friendly admin actions where feasible
* Access control for privileged operations

---

# 4. Rendering Strategy

This product intentionally mixes rendering strategies by route class.

## 4.1 Route Rendering Rules

### `/` and static marketing pages

* Static output by default
* SEO-first
* Optimized for low JS and fast first load

### `/blog/*`

* ISR-style regeneration
* Publicly cacheable where safe
* Content updates should trigger regeneration behavior
* No private user-specific content in blog responses

### `/app/*`

* CSR only
* Authenticated experience
* No requirement for SSR or SEO indexing
* Initial shell may be minimal, with data fetched client-side

### `/admin/*`

* CSR only
* Protected, authenticated, role-gated experience
* No requirement for SSR or SEO indexing

## 4.2 Framework-Agnostic Rendering Requirements

The chosen framework later must support:

* Static generation for public pages
* Revalidation/regeneration behavior for blog routes
* CSR-only route groups for `/app/*` and `/admin/*`
* Route-level access control
* API endpoints or server functions for data access and mutations

---

# 5. Target Users

## 5.1 Visitor

* Anonymous user browsing the marketing site and blog
* May convert into a registered user

## 5.2 Authenticated User

* Can log in and use `/app/*`
* Can manage their own account data
* Can access only authorized resources

## 5.3 Admin

* Internal or privileged operator
* Can manage blog content
* Can manage users and moderate data
* Can access `/admin/*`

---

# 6. User Stories

## 6.1 Visitor Stories

* As a visitor, I want to quickly understand the product value on the landing page.
* As a visitor, I want to read blog content without logging in.
* As a visitor, I want blog pages to load quickly and be indexable.
* As a visitor, I want to sign up from public CTAs.

## 6.2 Authenticated User Stories

* As a user, I want to create an account and log in securely.
* As a user, I want to remain signed in across sessions where appropriate.
* As a user, I want a responsive dashboard experience.
* As a user, I want to edit my profile and settings.
* As a user, I want clear feedback for loading, success, and error states.

## 6.3 Admin Stories

* As an admin, I want to create, edit, publish, and unpublish blog posts.
* As an admin, I want to manage user accounts.
* As an admin, I want to search, filter, and inspect records.
* As an admin, I want to perform actions only if my role allows it.
* As an admin, I want a reliable admin UI with confirmation and validation.

---

# 7. Functional Requirements

## 7.1 Authentication and Authorization

### Requirements

* Support email/password authentication via Better Auth.
* Support session management.
* Support protected routes.
* Support role-based access at minimum for:

  * `user`
  * `admin`
* Support logout.
* Support password reset flow if Better Auth implementation supports it in chosen integration.
* Support route guards for `/app/*` and `/admin/*`.

### Acceptance Criteria

* Unauthenticated users attempting `/app/*` are redirected or blocked.
* Unauthenticated users attempting `/admin/*` are redirected or blocked.
* Authenticated non-admin users cannot access admin pages or admin APIs.
* Session expiration is handled gracefully.

## 7.2 Public Website

### Requirements

* Static page generation for top-level public routes.
* Responsive navigation.
* CTA modules.
* SEO metadata for each public page.
* Contact form or lead capture form.
* Fast loading and image optimization strategy.

### Acceptance Criteria

* All public pages render without requiring login.
* Metadata is configurable per page.
* Public forms validate inputs and show success/error feedback.

## 7.3 Blog

### Requirements

* Blog posts stored in SQLite and accessed via Drizzle ORM.
* Each post has:

  * title
  * slug
  * excerpt
  * body/content
  * cover image (optional)
  * author reference
  * publish state
  * timestamps
  * SEO fields
* Blog detail page available by slug.
* Blog index with pagination.
* Optional tags/categories.
* ISR-style regeneration after publish or update.
* Admin editing UI.

### Acceptance Criteria

* Draft posts are not public.
* Published posts appear on `/blog/*`.
* Changing a published post updates public content after regeneration behavior completes.
* Duplicate slugs are prevented.

## 7.4 Consumer App

### Requirements

* Client-rendered shell for `/app/*`.
* Authenticated route access.
* Dashboard overview page.
* Settings/profile area.
* Core domain modules defined later in product-specific refinement.
* Loading, empty, success, and error states.
* Shared design system usage via DaisyUI-compatible components.

### Acceptance Criteria

* App pages can load user-specific data after login.
* Unauthorized data requests fail safely.
* Forms validate client-side and server-side.

## 7.5 Admin Panel

### Requirements

* Client-rendered admin shell for `/admin/*`.
* Admin-only access.
* User management table with search/filter.
* Blog management table with draft/published indicators.
* Blog editor form.
* Publish/unpublish actions.
* Soft deletion or archive flow for posts, if desired.

### Acceptance Criteria

* Admin can create a blog post draft.
* Admin can publish a post and make it visible publicly.
* Admin can update a post and trigger content refresh behavior.
* Admin can list users and inspect basic account data.

---

# 8. Technical Requirements

## 8.1 Stack Constraints

* Package manager must be **Bun**.
* ORM must be **Drizzle ORM**.
* Database must be **SQLite**.
* Authentication must be **Better Auth**.
* UI component system must be **DaisyUI**.
* The PRD must remain framework-agnostic until later specialization.

## 8.2 Database Requirements

* SQLite will be the primary database for v1.
* Drizzle handles schema definition, type-safe querying, and migrations.
* Schema should be normalized enough for maintainability but not over-engineered.
* WAL mode and backup strategy should be defined during implementation.

## 8.3 API / Server Requirements

The final framework must provide a server execution layer for:

* authentication endpoints
* session validation
* user CRUD operations where allowed
* blog CRUD operations
* admin-only mutations
* regeneration/invalidation triggers or equivalents
* input validation
* error handling

## 8.4 Validation Requirements

* Shared validation layer for client and server where possible.
* Form validation messages must be user-friendly.
* Mutation endpoints must reject invalid or unauthorized requests.

## 8.5 Design System Requirements

* DaisyUI should define the consistent visual primitives.
* Theme tokens should be centralized.
* The app should have reusable patterns for:

  * buttons
  * forms
  * modals
  * tables
  * alerts
  * toasts
  * tabs
  * cards
  * drawers

---

# 9. Information Architecture

## 9.1 Route Map

### Public Routes

* `/`
* `/features`
* `/pricing`
* `/about`
* `/contact`
* `/privacy`
* `/terms`

### Blog Routes

* `/blog`
* `/blog/[slug]`
* `/blog/tag/[tag]` (optional)
* `/blog/category/[category]` (optional)

### Auth Routes

* `/login`
* `/register`
* `/forgot-password`
* `/reset-password`

### App Routes

* `/app`
* `/app/dashboard`
* `/app/settings`
* `/app/profile`
* `/app/...future-modules`

### Admin Routes

* `/admin`
* `/admin/dashboard`
* `/admin/users`
* `/admin/users/[id]`
* `/admin/blog`
* `/admin/blog/new`
* `/admin/blog/[id]/edit`
* `/admin/settings`

---

# 10. Data Model (Initial)

## 10.1 Users

Fields:

* id
* email
* username or display_name
* password hash / auth provider references
* role (`user`, `admin`)
* status (`active`, `suspended`, etc.)
* created_at
* updated_at
* last_login_at (optional)

## 10.2 Sessions / Auth Tables

Managed according to Better Auth integration requirements.

Fields likely include:

* session id
* user id
* token or session key references
* expiration
* created_at
* updated_at

## 10.3 Blog Posts

Fields:

* id
* title
* slug
* excerpt
* content_body
* cover_image_url (optional)
* seo_title (optional)
* seo_description (optional)
* status (`draft`, `published`, `archived`)
* author_id
* published_at (nullable)
* created_at
* updated_at

## 10.4 Blog Tags

Fields:

* id
* name
* slug

## 10.5 Blog Post Tags (Join Table)

Fields:

* post_id
* tag_id

## 10.6 Audit Log (Recommended)

Fields:

* id
* actor_user_id
* action_type
* entity_type
* entity_id
* metadata_json
* created_at

---

# 11. Permissions Model

## 11.1 Roles

### User

* Can access `/app/*`
* Can manage own profile/settings
* Cannot access admin routes or admin mutations

### Admin

* Full user capabilities
* Can access `/admin/*`
* Can manage blog posts
* Can inspect users
* Can perform admin mutations

## 11.2 Authorization Rules

* UI gating alone is insufficient; server-side authorization is mandatory.
* Every admin mutation must verify admin role.
* Every user-specific query must scope results to the current user unless admin override is intended.

---

# 12. Blog Editing Requirements

## 12.1 Blog Editor Capabilities

* Create draft
* Edit title, slug, excerpt, body, SEO metadata
* Save draft
* Publish
* Unpublish or revert to draft
* Preview mode (recommended)

## 12.2 Slug Rules

* Slugs must be unique.
* Slugs should be normalized.
* Changing a published slug should be deliberate and may require redirect support later.

## 12.3 Publishing Rules

* Only admins can publish.
* A post must have minimum required fields before publishing.
* Publishing updates `published_at` if not previously set.

---

# 13. UX and UI Requirements

## 13.1 General UX Requirements

* Responsive design for desktop first, mobile-friendly where practical.
* Accessibility-conscious forms and controls.
* Clear empty states.
* Clear error states.
* Destructive actions require confirmation.
* Long-running actions show progress indicators.

## 13.2 Dashboard UX

* Navigation optimized for multi-page application use.
* Persistent shell with sidebar/topbar patterns.
* Search/filter for tables.
* Reusable data table components.
* Toasts for mutation feedback.

## 13.3 Admin UX

* High-density information layouts permitted.
* Data tables with pagination/filter/sort.
* Blog form with field validation.
* Publish state visibly differentiated.

---

# 14. Non-Functional Requirements

## 14.1 Performance

* Static pages should load quickly and minimize JS.
* Blog pages should be cache-friendly.
* CSR app shells should avoid unnecessary bundle bloat.
* Tables and dashboards should support pagination and lazy data fetching where appropriate.

## 14.2 Reliability

* Critical forms must handle retries safely.
* Mutations should return consistent structured errors.
* Database migration workflow must be deterministic.

## 14.3 Security

* Passwords must never be stored in plaintext.
* Session handling must be secure.
* CSRF/session considerations must follow the chosen Better Auth integration model.
* Input validation and output encoding are required.
* Admin surfaces must not be discoverable solely by hidden links; authorization must enforce access.

## 14.4 Maintainability

* Clear route/module boundaries.
* Shared UI primitives.
* Shared validation and domain logic where practical.
* Test coverage over core workflows.

---

# 15. Observability and Operational Requirements

## 15.1 Logging

* Log auth failures, admin actions, publish actions, and server errors.
* Avoid logging secrets or sensitive tokens.

## 15.2 Monitoring

* Track failed requests, auth failures, and publish failures.
* Surface key health checks in development and production.

## 15.3 Backups

* SQLite backup process must be documented.
* Migrations must be reversible where feasible.

---

# 16. Analytics Requirements (Optional but Recommended)

## 16.1 Public Analytics

* Page views
* CTA clicks
* blog post views
* referral sources where legal and appropriate

## 16.2 App Analytics

* sign-up completion
* login success/failure metrics
* feature usage events

## 16.3 Admin Analytics

* posts created/published
* user count growth
* key moderation/admin actions

---

# 17. MVP Definition

The MVP is complete when all of the following are true:

* Static marketing pages exist and are navigable.
* Public blog exists with index and detail pages.
* Admin can create/edit/publish blog posts.
* Authentication works for users and admins.
* `/app/*` is protected and functional in CSR-only mode.
* `/admin/*` is protected and functional in CSR-only mode.
* Basic user management exists for admins.
* Core tests pass.
* Documentation exists for local setup, migrations, and deployment.

---

# 18. Delivery Phases

## Phase 0: Foundations

* Initialize repo with Bun
* Configure linting/formatting/testing baseline
* Set up DaisyUI theme tokens
* Set up Drizzle ORM
* Set up SQLite database file and migration flow
* Integrate Better Auth
* Define route groups and module boundaries

## Phase 1: Public Site

* Build static marketing routes
* Shared layout/header/footer
* Contact/lead form
* SEO metadata structure

## Phase 2: Blog

* Blog schema
* Admin blog CRUD APIs
* Public blog index/detail routes
* Draft/publish workflow
* ISR-style regeneration mechanism

## Phase 3: Auth + User App

* Register/login/logout
* Session restoration
* Protected `/app/*`
* User settings/profile
* First product dashboard views

## Phase 4: Admin Panel

* Protected `/admin/*`
* User management screens
* Blog management screens
* Publish workflow polish
* audit-friendly logging

## Phase 5: Hardening

* E2E tests
* security review
* performance review
* accessibility pass
* deployment and backup docs

---

# 19. Implementation Checklist

## 19.1 Foundations Checklist

* [ ] Initialize Bun workspace/project
* [ ] Configure TypeScript baseline
* [ ] Configure linting and formatting
* [ ] Install and configure DaisyUI
* [ ] Establish theme variables and design tokens
* [ ] Install Drizzle ORM and migration tooling
* [ ] Create SQLite database configuration
* [ ] Define environment/config management strategy
* [ ] Integrate Better Auth
* [ ] Define route groups for public, blog, app, and admin
* [ ] Establish shared validation utilities
* [ ] Establish shared error handling strategy

## 19.2 Auth Checklist

* [ ] Registration flow
* [ ] Login flow
* [ ] Logout flow
* [ ] Session persistence
* [ ] Route protection for `/app/*`
* [ ] Route protection for `/admin/*`
* [ ] Role-based access checks
* [ ] Password reset flow if in scope
* [ ] Unauthorized/forbidden UI states

## 19.3 Public Site Checklist

* [ ] Home page
* [ ] Features page
* [ ] Pricing page
* [ ] About page
* [ ] Contact page
* [ ] Legal pages
* [ ] Shared SEO helper
* [ ] CTA placement review
* [ ] Responsive QA

## 19.4 Blog Checklist

* [ ] Blog post schema
* [ ] Tag/category schema if included
* [ ] Blog index route
* [ ] Blog detail route
* [ ] Slug uniqueness validation
* [ ] Draft save flow
* [ ] Publish flow
* [ ] Update flow
* [ ] Unpublish/archive flow
* [ ] SEO fields support
* [ ] Regeneration behavior implemented
* [ ] Public cache strategy documented

## 19.5 App Checklist

* [ ] App shell layout
* [ ] Dashboard page
* [ ] Profile page
* [ ] Settings page
* [ ] Protected data fetching
* [ ] Error/loading/empty states
* [ ] Reusable table/form primitives

## 19.6 Admin Checklist

* [ ] Admin shell layout
* [ ] Admin dashboard
* [ ] User listing
* [ ] User detail view
* [ ] Blog listing
* [ ] Blog create/edit form
* [ ] Publish/unpublish actions
* [ ] Search/filter/pagination
* [ ] Destructive action confirmations
* [ ] Audit log hooks or action logging

## 19.7 Quality Checklist

* [ ] Unit tests for utilities and domain logic
* [ ] Integration tests for auth and blog APIs
* [ ] E2E tests for critical flows
* [ ] Accessibility checks on forms/nav
* [ ] Performance review for public pages
* [ ] Deployment checklist
* [ ] Backup and migration docs

---

# 20. Test Strategy

## 20.1 Testing Levels

### Unit Tests

Focus on:

* validation functions
* slug generation
* role checks
* utility functions
* content state transitions (draft -> published)

### Integration Tests

Focus on:

* auth flows
* session validation
* protected route/API access
* blog CRUD endpoints
* publish/unpublish workflows
* admin-only authorization
* database queries and migrations

### End-to-End Tests

Focus on:

* visitor browsing public site
* visitor reading blog post
* user registration/login
* user reaching `/app/*`
* non-admin denied from `/admin/*`
* admin logging in
* admin creating/editing/publishing a post
* published post appearing publicly
* user logout

## 20.2 Recommended Test Coverage Areas

### Auth Tests

* valid registration succeeds
* duplicate email fails cleanly
* valid login succeeds
* invalid credentials fail
* expired/invalid session is rejected
* admin-only endpoint rejects regular user

### Blog Tests

* draft post not visible publicly
* published post visible publicly
* duplicate slug rejected
* updating content changes public output after regeneration behavior
* archived/unpublished post removed from public listing

### App Tests

* unauthenticated user blocked from `/app/*`
* authenticated user can access `/app/dashboard`
* user cannot access another user's protected records

### Admin Tests

* unauthenticated visitor blocked from `/admin/*`
* normal user blocked from `/admin/*`
* admin can access `/admin/dashboard`
* admin can create/update/publish content
* admin can list users

### Regression Tests

* public routes still accessible after auth changes
* blog publishing does not break static landing pages
* app/admin route guards remain enforced after routing changes

---

# 21. Acceptance Test Matrix

## Public Site

* [ ] All public pages render correctly
* [ ] Nav and footer links work
* [ ] SEO metadata is present
* [ ] Contact form validates input

## Blog

* [ ] Blog index lists published posts only
* [ ] Blog detail resolves by slug
* [ ] Draft posts are hidden
* [ ] Post updates propagate through regeneration model

## App

* [ ] Unauthenticated access denied
* [ ] Authenticated access granted
* [ ] User data loads correctly
* [ ] Forms validate and save correctly

## Admin

* [ ] Non-admin access denied
* [ ] Admin access granted
* [ ] Blog CRUD works
* [ ] User listing works
* [ ] Publish/unpublish works

---

# 22. Risks and Tradeoffs

## 22.1 SQLite Constraints

* SQLite is simple and fast for many workloads, but write concurrency may become a bottleneck as scale grows.
* For v1 this is acceptable if traffic and write volume are moderate.

## 22.2 CSR-Only App/Admin Tradeoff

* CSR-only simplifies some route behavior and avoids SSR complexity for authenticated surfaces.
* It may increase initial client bundle reliance.
* This is acceptable since SEO is not required for these surfaces.

## 22.3 Framework-Agnostic Constraint

* Avoid framework-specific assumptions in routing, loaders, invalidation APIs, and file structure.
* Some adaptation work will still be required later for TanStack Start or SvelteKit.

## 22.4 DaisyUI Constraint

* DaisyUI is framework-agnostic in usage patterns but Tailwind-oriented in implementation. The eventual framework must integrate cleanly with that styling approach.

---

# 23. Future Enhancements

* Rich text or markdown editor improvements
* Scheduled publishing
* Image upload and media library
* Search across blog content
* Multi-role permissions beyond `user` and `admin`
* Team/organization support
* Billing/subscriptions
* Notification center
* Feature flags
* API tokens/webhooks

---

# 24. Open Questions for Later Refinement

* What are the core domain modules inside `/app/*` beyond dashboard/profile/settings?
* Should blog content be markdown, MDX-like, rich text JSON, or sanitized HTML?
* Is image upload required in v1?
* Do we need social auth in addition to email/password?
* Should admins be able to impersonate users?
* Do we want soft deletion for users and posts?
* What analytics stack will be used?
* What deployment target is preferred?
* How should regeneration be triggered in the final implementation: time-based, on-demand, or both?

---

# 25. Final Recommendation

For implementation later, preserve the following boundaries:

* **Public web concern**: static + SEO + blog regeneration
* **Application concern**: authenticated CSR product surface
* **Administration concern**: privileged CSR management surface
* **Server concern**: auth, persistence, authorization, blog operations, user management

This separation will make later adaptation to either TanStack Start or SvelteKit significantly cleaner.

---

# 26. Definition of Done

The project is considered done for v1 when:

* Core route groups are implemented according to rendering requirements.
* Auth and authorization flows are complete.
* Blog publishing and public rendering work end-to-end.
* App and admin panels are protected and functional.
* Database schema and migrations are stable.
* Test suite covers critical workflows.
* Setup, migration, and deployment documentation is complete.
* No critical security or data integrity issues remain open.
