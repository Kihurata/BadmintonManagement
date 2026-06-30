---
title: 'Learning: TypeScript Strict Compilation'
description: Learnings from resolving build-blocking ESLint warnings and TypeScript compilation errors in Next.js and Supabase
createdAt: '2026-06-29T14:44:08.150Z'
updatedAt: '2026-06-29T14:44:08.150Z'
tags:
  - learning
  - typescript
  - eslint
---

# Learning: TypeScript Strict Compilation

Learnings from resolving build-blocking ESLint warnings and TypeScript compilation errors in Next.js and Supabase.

## Patterns

### safe-casting Supabase Join Relations
- **What:** Use `Array.isArray` combined with `unknown` casting to safely parse Supabase join query results without using `as any`.
- **When to use:** When retrieving nested table properties (e.g. `customers(name)`) which TypeScript types as either an array or object, and strict rules (`@typescript-eslint/no-explicit-any`) prevent `as any`.
- **Example:**
  ```typescript
  customerName: (Array.isArray(dbBooking.customers)
    ? (dbBooking.customers[0] as unknown as { name: string })?.name
    : (dbBooking.customers as unknown as { name: string })?.name) || 'Khách vãng lai'
  ```
- **Source:** @task-rres6a

### Strict Payloads for DB Updates
- **What:** Explicitly type dynamic payload variables used for database update statements rather than leaving them untyped or cast to `any`.
- **When to use:** When building conditional database update dictionaries for partial mutations.
- **Example:**
  ```typescript
  const ruleUpdate: { customer_id?: string } = {};
  ```
- **Source:** @task-rres6a

## Decisions

### Centralized Import for Common Fonts
- **Chose:** Loading Material Symbols via CSS `@import` in `globals.css`.
- **Over:** Adding raw HTML `<link>` tag in the `layout.tsx` file.
- **Tag:** GOOD_CALL
- **Outcome:** Eliminates duplicated font requests, speeds up initial render, and completely avoids the Next.js `no-page-custom-font` compiler warning.

## Failures

### Dead Code Leftovers Blocking Builds
- **What went wrong:** Production builds bailing out due to unused import statements (`useUserRole`, `vi`) and unused destructured variables (`role`) left behind after code changes.
- **Root cause:** Strict configurations treating typescript/eslint warnings as compilation errors.
- **Time lost:** ~15 minutes.
- **Prevention:** Always clean up unused imports/variables during refactoring. Run `npm run build` locally before pushing to verify compile cleanliness.
- **Source:** @task-rres6a
