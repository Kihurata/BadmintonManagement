---
title: "Learning: Bruno API Testing"
description: "Learnings and conventions from setting up Bruno API testing for Next.js and Supabase."
createdAt: "2026-06-27T15:52:00.000Z"
updatedAt: "2026-06-27T15:52:00.000Z"
tags:
  - learning
  - bruno
  - testing
---

# Learning: Bruno API Testing

Learnings and conventions from setting up Bruno API testing for Next.js and Supabase.

## Patterns

### Git-Friendly API Documentation (Bruno)
- **What:** Storing Bruno API request collections as plain text `.bru` files inside a `bruno/` directory in the repository root.
- **When to use:** For documenting, manual testing, and automated CLI validation of Next.js API Route Handlers.
- **Source:** @task-jnm8r7

### Supabase SSR Session Cookie Format in Bruno
- **What:** A Bruno post-response script on the Login request that parses the Supabase JSON response session, encodes it in `base64url`, prepends `base64-`, and saves it as a variable (`supabaseCookie`).
- **When to use:** To bypass `@supabase/ssr` cookies in Next.js Server Components and Middleware during local API client testing.
- **Source:** @task-jnm8r7

## Decisions

### Version-Controlled Collections
- **Chose:** Bruno `.bru` collections.
- **Over:** Postman JSON exports or hosted collections.
- **Tag:** GOOD_CALL
- **Outcome:** The API request configurations are fully visible, readable, and diffable in git history.
- **Recommendation:** Always commit `.bru` request files in the repository alongside code changes.

## Failures

### Broad Recursive Search Without Exclusions
- **What went wrong:** Running directory searches (like recursive `.bru` search) from shell commands without ignoring `node_modules` and `.next` hangs the agent terminal.
- **Root cause:** Large generated and downloaded dependency folders contain millions of files.
- **Time lost:** 5 minutes.
- **Prevention:** Always pipe through filtering commands or use explicit `--exclude` and exclude flags to bypass build and dependency directories.
