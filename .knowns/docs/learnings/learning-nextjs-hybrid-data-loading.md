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
