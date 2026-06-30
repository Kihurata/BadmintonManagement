---
title: 'Learning: Build Verification Before Commit'
description: Learnings on build verification and Next.js Suspense boundary requirements
createdAt: '2026-05-25T10:02:52.840Z'
updatedAt: '2026-05-25T10:02:52.840Z'
tags:
  - learning
  - verification
---

# Learning: Build Verification Before Commit

Learnings about build verification, Next.js Suspense boundary requirements, and why running `npm run build` is necessary before committing.

## Decisions

### Always Run npm run build Before Committing
- **Chose:** Running the full Next.js production build (`npm run build`) in addition to unit tests.
- **Over:** Relying solely on `npm test` or local dev mode checks.
- **Tag:** GOOD_CALL
- **Outcome:** Catches build-time static generation errors (like CSR bailouts from `useSearchParams()`) that are not detected during Jest unit tests or local development mode.
- **Recommendation:** Always run `npm run build` locally before committing code to ensure that all static and dynamic pages compile successfully.

## Failures

### Next.js useSearchParams CSR Bailout
- **What went wrong:** The production build failed because `useSearchParams()` was called directly inside `/src/app/page.tsx` without being wrapped in a `<Suspense>` boundary.
- **Root cause:** Next.js de-optimizes static site generation and throws an error during `next build` if client components use `useSearchParams()` without a surrounding Suspense fallback, as it forces the page to bail out to client-side rendering.
- **Time lost:** ~15 minutes.
- **Prevention:** Wrap any page or client component using `useSearchParams()` in a `<Suspense>` boundary.
