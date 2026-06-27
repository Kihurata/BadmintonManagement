---
title: Critical Patterns
description: Promoted learnings that save the most time. Read at session start.
createdAt: '2026-05-25T10:03:03.692Z'
updatedAt: '2026-06-23T17:32:01.106Z'
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
