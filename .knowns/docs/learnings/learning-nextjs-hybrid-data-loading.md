---
title: 'Learning: Next.js Hybrid Data Loading'
description: Learnings on Next.js hybrid data loading patterns, versioning, and client-side sync.
createdAt: '2026-06-30T03:51:17.570Z'
updatedAt: '2026-06-30T06:54:20.916Z'
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

### Optional Prop Component Bootstrapping
- **What:** Pass pre-fetched data (e.g., `courts`, `customers`) as optional props to interactive client components, and fall back to client-side API fetches (`useEffect`) only if the props are empty or not provided.
- **When to use:** On forms or dialogs that are rendered in multiple contexts (some where data is already preloaded by the parent, and others where it is rendered standalone).
- **Source:** @task-r6c9t3

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

### Programmatic Cache Invalidation on Mount
- **Chose:** Calling `router.refresh()` inside the mounting `useEffect` of layout/page client components.
- **Over:** Relying solely on real-time database updates or expecting Next.js client router cache to refresh automatically on page transitions.
- **Tag:** GOOD_CALL
- **Outcome:** Programmatically invalidates the Next.js client-side prefetch/router cache upon route entry, ensuring the layout immediately displays the latest database state without a hard reload.
- **Recommendation:** Add mounting `useEffect` refresh triggers to dashboards, schedule pages, and home views.

## Failures

### Next.js Client Router Caching
- **What went wrong:** Real-time WebSocket events were missed on a route while it was unmounted. When the user navigated back to it using standard Next.js `<Link>` client routing, the route served stale data from the prefetch cache.
- **Root cause:** Next.js client router cache is aggressive and does not re-fetch Server Component props on navigation by default.
- **Prevention:** Run `router.refresh()` on page client component mount to force cache invalidation.
- **Source:** @task-r6c9t3

### Unbounded Date range in Real-Time Status Filters
- **What went wrong:** Homepage court status cards showed incorrect booking statuses (e.g. "Booked: 17:30") even when there were no bookings for the current day.
- **Root cause:** Filter logic only checked if the booking's `start_time` was after `now` without bounding by day (e.g. `isSameDay`). This let tomorrow's bookings leak into today's timeline.
- **Prevention:** Enforce `isSameDay(now, new Date(b.start_time))` alongside future time comparisons.
- **Source:** @task-r6c9t3
