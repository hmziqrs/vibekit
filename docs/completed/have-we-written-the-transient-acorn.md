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
- [ ] Blog platform completion
- [ ] Admin & moderation tools
- [ ] Organizations & teams
- [ ] Billing & payments
- [ ] Email & communications
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
