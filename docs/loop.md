# Ralph Loop Prompt: Vibekit Project Roadmap

## Context

Vibekit is a SvelteKit SaaS boilerplate on Cloudflare Workers. This loop builds a planning document (`ROADMAP.md`) that catalogs every gap, feature, and infrastructure need. The document itself is a lightweight skeleton — one or two lines per phase. All detail is discovered at runtime by subagents exploring the codebase.

## The Prompt

Copy the block below into a new Claude Code session to start the loop:

---

```
/loop

Build and refine ROADMAP.md — a planning document for this SvelteKit/Cloudflare Workers project.

## Global Rules

- No code in ROADMAP.md. Bullet-point references only.
- No `any`, no `unknown`, no type hacks. Everything must be properly typed.
- All new code must pass `bun run check`, `bun run lint`, `bun run format:check`.
- Tests are mandatory. No untested code ships.
- Use Sonnet subagents for all exploration and research.

## Document Format

ROADMAP.md has two parts:

### Part 1: Rules & Standards (static, written once)
- TypeScript strict mode, no `any`/`unknown` casts
- Must pass: `bun run check`, `bun run lint`, `bun run format:check`, `bun run test`
- New features require E2E tests
- All server code uses `$lib/server/` — never imported from client
- Svelte 5 runes only (no legacy syntax)
- Use semantic color tokens from `layout.css` (no hardcoded hex/Tailwind colors)
- Use `cn()` from `$lib/utils` for class merging

### Part 2: Implementation Phases (iterative)
Each phase is one or two lines max. Subagents discover all detail at runtime.

- [ ] Dev environment & DX
- [ ] Auth security hardening
- [ ] Core app features
- [ ] Blog platform — full-fledged publishing system:
  - Markdown editor with toolbar, split-pane preview, keyboard shortcuts (Milkdown / TipTap / CodeMirror+preview)
  - Inline image upload-insert flow inside the editor body (upload to R2 → insert markdown image syntax)
  - Syntax highlighting for code blocks (Shiki or similar, rendered server-side)
  - Tag system: wire up dead tagIds code — tag CRUD API, tag selector in editor, public tag pages, tag display on posts
  - Pagination on public blog index (cursor or offset, load more or page nav)
  - Author attribution on public posts (join user table for display name)
  - Reading time estimation on posts
  - Table of contents auto-generated from headings
  - Replace regex sanitization with DOMPurify
  - RSS/Atom feed endpoint
  - Draft preview (shareable link or admin-only preview route)
  - Delete button on the blog edit page
  - Audit log writes on blog mutations
- [ ] Admin & moderation tools
- [ ] User audit log & activity tracking (dispute resolution, security reviews, compliance trails)
- [ ] Admin sudo / impersonation mode (support acts on behalf of user with full audit trail)
- [ ] Security alerts & anomaly detection (new device/IP, password/2FA change, suspicious activity)
- [ ] Organizations & teams
- [ ] Billing & payments
- [ ] In-app notifications & system-to-user alerts (payment receipts, admin warnings, broadcast announcements)
- [ ] User banning system (temporary/permanent platform ban with reason, appeal flow)
- [ ] User account disabled (user-initiated deactivation vs admin disable, data retention, re-enable flow)
- [ ] Email & communications
- [ ] Rate limiting & abuse prevention (API throttling, auth brute-force protection, action quotas per tier)
- [ ] Webhooks & event bus (async cross-service events, third-party integrations)
- [ ] API keys & programmatic access (scoped tokens, usage logging)
- [ ] Feature flags & kill switches (gradual rollout, instant disable without deploy)
- [ ] Session & device management (list active sessions, remote logout, device fingerprinting)
- [ ] Maintenance mode & scheduled broadcasts (global downtime banners, planned maintenance notices)
- [ ] User data export / portability (one-click full data download, GDPR compliance)
- [ ] Infrastructure & DevOps
- [ ] Testing & quality
- [ ] SEO & performance
- [ ] i18n completion
- [ ] Analytics & tracking
- [ ] Compliance & privacy
- [ ] Dead code cleanup

## Loop Behavior

Each cycle:
1. Read ROADMAP.md current state
2. Pick the next unchecked phase
3. Launch 2-3 Explore subagents (Sonnet) to investigate:
   - Agent 1: Trace current implementation (routes, APIs, schema, components)
   - Agent 2: Find gaps, TODOs, unused code, missing error handling
   - Agent 3: Web research if anything is unclear (library capabilities, platform features, best practices)
4. Expand that phase into actionable sub-bullets — still no code, just what needs to happen
5. Mark phase as [x] when all sub-bullets are grounded in actual codebase findings
6. When all phases are [x], stop the loop

Start with auth security hardening — it's the most blocking gap.
```

## Verification

1. Copy the prompt block (between the ``` fences)
2. Start a new Claude Code session in the vibekit directory
3. Paste as your first message
4. The loop creates `ROADMAP.md` and iterates through each phase
5. Each cycle discovers real gaps from the codebase — nothing is pre-filled
