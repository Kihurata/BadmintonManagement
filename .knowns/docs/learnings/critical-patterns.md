---
title: Critical Patterns
description: Promoted learnings that save the most time. Read at session start.
createdAt: '2026-05-25T10:03:03.692Z'
updatedAt: '2026-06-30T03:51:27.547Z'
tags:
  - learning
  - critical
---

# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `kn-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-05-25 Always Run npm run build Before Commit
**Category:** convention
**Source:** User feedback / build debug
**Tags:** [verification, build]

Running Next.js production build catches build-time static generation errors (like `useSearchParams()` without a `Suspense` boundary) that Jest unit tests or local dev servers do not catch. Always run `npm run build` locally before committing code to prevent CI/CD build failures.

**Full entry:** @doc/learnings/learning-build-verification-before-commit


## 2026-06-24 Next.js Route Handler Export Restriction
**Category:** convention
**Source:** @task-0gih9b
**Tags:** [nextjs, compilation]

Next.js App Router route handlers (`route.ts`) are extremely strict about exports. Exporting non-handler functions or validation schemas (like Zod objects) to sibling files breaks the static production compilation (`next build`). Always define validation schemas inline inside the route file or import them from external, non-route files.

**Full entry:** @doc/learnings/learning-rest-products-api

## 2026-06-24 ZodEffects and Partial Limitation
**Category:** failure
**Source:** @task-0gih9b
**Tags:** [zod, validation]

Calling `.partial()` on a Zod schema that has been refined using `.refine()` (which produces a `ZodEffects` wrapper) will fail at compilation time because `ZodEffects` does not support the `.partial()` modifier. Always call `.partial()` on the base object schema *before* applying `.refine()` refinements.

**Full entry:** @doc/learnings/learning-rest-products-api

## 2026-06-27 Zod Schema Conditional Validation Logic
**Category:** failure
**Source:** @task-0gih9b
**Tags:** [zod, validation, security]

Defining dependent fields (e.g. packaging price, packaging units) as independent optional attributes creates logic vulnerabilities (clients can send `is_packable: true` but omit details). Always use `.refine()` or `.superRefine()` on Zod schemas to enforce conditional validation where dependent fields become strictly required.

**Full entry:** @doc/learnings/learning-rest-products-api

## 2026-06-27 Soft Deactivation Status Design
**Category:** decision
**Source:** @task-0gih9b
**Tags:** [database, api-design]

Relying solely on physical `DELETE` endpoints creates data constraint violations (409 Conflict) when the entity is referenced by transactional history (e.g. invoice items). Always introduce a `status` field (`ACTIVE` | `INACTIVE`) to support soft deactivation, permitting the frontend to hide items without breaking database integrity.

**Full entry:** @doc/learnings/learning-rest-products-api


## 2026-06-27 Bruno API Test Automation
**Category:** convention
**Source:** @task-jnm8r7
**Tags:** [testing, api, automation]

Every time you write or modify a Next.js API Route Handler, write a corresponding `.bru` request file inside the `bruno/` directory. Run the Bruno CLI runner (`npx @usebruno/cli run bruno/ --env Local`) to verify that all API endpoints function securely and successfully before committing code.

**Full entry:** @doc/learnings/learning-bruno-api-testing

## 2026-06-29 TypeScript Safe-Casting Supabase Join Relations
**Category:** pattern
**Source:** @task-rres6a
**Tags:** [typescript, supabase]

When querying join tables (e.g. `customers(name)`) under strict typescript config (`@typescript-eslint/no-explicit-any`), cast relation returns using `Array.isArray` check and `unknown` casting rather than bypassing checks with `as any`.

**Full entry:** @doc/learnings/learning-typescript-strict-compilation


## 2026-06-30 Next.js Hybrid Data Loading Pattern
**Category:** convention
**Source:** Architectural Alignment
**Tags:** [nextjs, architecture, api]

Fetch initial read-only data directly via repositories in Server Components to eliminate loopback API latency and layout shifts, then execute mutations/writes via relative requests to versioned `/api/v1/` Route Handlers, using `router.refresh()` to trigger prop synchronization.

**Full entry:** @doc/learnings/learning-nextjs-hybrid-data-loading

## 2026-07-05 Next.js Server-Side Route Migration for SDK Queries
**Category:** decision
**Source:** Triage and loading debugging
**Tags:** [nextjs, supabase, client-side]

Avoid direct client-side Supabase SDK queries (`supabase.from(...)`) in Client Components when session cookies or custom headers are required. Migrating them to server-side Next.js GET Route Handlers prevents browser/PWA auth state hangs and ensures requests are traceable in DevTools.

**Full entry:** @doc/learnings/learning-nextjs-hybrid-data-loading

## 2026-07-05 next-pwa Service Worker Git Untracking
**Category:** failure
**Source:** Merge conflict triage
**Tags:** [git, nextjs, next-pwa]

Auto-generated files like `public/sw.js` and `public/workbox-*.js` updated on local builds must be untracked (`git rm --cached`) in Git history. If committed before ignoring, they will ignore `.gitignore` and cause merge conflicts on every developer build.

**Full entry:** @doc/learnings/learning-nextjs-hybrid-data-loading


## 2026-07-05 Supabase Remote Migration History Repair
**Category:** failure
**Source:** Migration sync triage
**Tags:** [database, supabase, migration]

Locally renaming, deleting, or squashing migration files after they have already been pushed to a remote database breaks future schema deployments. Use `npx supabase migration repair --status reverted --linked <versions>` to untrack missing remote migration records, and `--status applied` to mark local consolidated replacements as applied.

**Full entry:** @doc/learnings/learning-supabase-migration-troubleshooting
