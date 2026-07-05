---
title: 'Learning: Next.js Hybrid Data Loading'
description: Learnings on Next.js hybrid data loading patterns, versioning, and client-side sync.
createdAt: '2026-06-30T03:51:17.570Z'
updatedAt: '2026-06-30T03:51:17.570Z'
tags:
  - learning
  - nextjs
  - api
  - architecture
---

# Learning: Next.js Hybrid Data Loading

Learnings and guidelines for data loading in Next.js App Router, combining Server Components and Route Handlers.

## Patterns

### Hybrid Server/Client Data Loading
- **What:** Fetch initial read-only data (e.g. courts list) directly from database repositories inside a Server Component, pass it as a prop to a Client Component, and perform mutations (e.g. booking creation) via relative HTTP requests to a versioned REST API.
- **When to use:** On pages requiring fast initial rendering combined with client-side interactivity and database mutations.
- **Source:** Architectural Alignment

### Client-Side Sync via Next.js Router Refresh
- **What:** Invoke `router.refresh()` (from `next/navigation`) after a successful REST mutation in the Client Component to trigger server-side re-fetching and update props without losing client state.
- **When to use:** To synchronize client-side components with database updates made via Route Handlers.
- **Source:** Architectural Alignment

## Decisions

### Versioned APIs in Subfolders
- **Chose:** Grouping Route Handlers in a `/api/v1/` subfolder structure.
- **Over:** Putting handlers directly in `/api/` with no version prefix.
- **Tag:** GOOD_CALL
- **Outcome:** Retains compatibility with Bruno testing configurations, supports API versioning/backwards compatibility, and fulfills Spec Decision D1.
- **Recommendation:** Keep `/api/v1/` folders for standard entities (e.g., bookings, products).

### Direct DB Repository Queries in Server Components
- **Chose:** Direct imports of repositories (e.g., in `src/server/repositories/`) within Server Components.
- **Over:** Calling `fetch('/api/v1/...')` internally.
- **Tag:** GOOD_CALL
- **Outcome:** Eliminates double-fetching loopback latency, providing instant page load times and zero layout shifts.
- **Recommendation:** Do not use internal HTTP calls in Server Components. Use database/repository queries directly.

### Persistent Tab Visibility Toggling
- **Chose:** Keeping tabs mounted in the DOM and toggling their visibility using CSS `.hidden` classes.
- **Over:** Conditional rendering (unmounting/remounting components on tab toggle).
- **Tag:** GOOD_CALL
- **Outcome:** Eliminates loading spinner flashing and 100-300ms layout-shift delays, preserving React states (e.g. scroll positions, fetched rules) for an instant 0ms tab-switching UX.
- **Recommendation:** Use CSS hidden toggles for heavy dashboard tabs.

### Server-Side Route Migration for Client Queries
- **Chose:** Implementing server-side Next.js GET API handlers to fetch data.
- **Over:** Querying Supabase directly on the client via `supabase.from(...)`.
- **Tag:** TRADEOFF
- **Outcome:** Bypasses client-side auth state / PWA service worker session hangs (which cause silent loading freezes on initial load) and makes requests fully traceable in the Developer Tools Network tab.
- **Recommendation:** Prefer server-side Route Handlers for fetching complex entities.

## Failures

### Trigger-Happy database trigger condition
- **What went wrong:** Adding products to prepaid bookings automatically marked the products as prepaid (reducing due amount to 0đ).
- **Root cause:** The database trigger condition `NEW.paid_amount < NEW.total_amount` forced `paid_amount := total_amount` on any total increase, even for already paid invoices.
- **Prevention:** Only auto-sync `paid_amount` when `is_paid` transitions from `FALSE` to `TRUE`.

### Committing next-pwa Auto-Generated Files
- **What went wrong:** Generated service worker files (`public/sw.js` and `public/workbox-*.js`) caused continuous merge conflicts across branches.
- **Prevention:** Untrack these files in Git (`git rm --cached`) so they respect `.gitignore` rules while remaining locally during build.
