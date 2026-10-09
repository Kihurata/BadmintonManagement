---
id: doc-0ac4817f79fe35e4c7deaf23d2ca3d21
title: fix-dashboard-loading-and-caching
description: Specification for fixing dashboard loading freeze, removing full-screen spinner, and optimizing data loading
createdAt: '2026-10-08T08:38:00.792Z'
updatedAt: '2026-10-08T08:38:00.792Z'
tags:
  - spec
  - approved
---

# Specification: Fix Dashboard Loading & Caching (Skeleton-Only UX)

## Overview

Eliminate intermittent loading freezes on the Executive Dashboard (`/dashboard`) by removing the full-screen `<Loader2 />` spinner, transitioning the page from a client-side fetch waterfall to a Next.js Server Component + Suspense architecture with a dedicated `loading.tsx` skeleton pulse, and extracting a clean, date-bounded server repository (`dashboard-repo.ts`) to resolve heavy multi-month database queries.

## Locked Decisions

- D1: Render the full dashboard layout (Sidebar, StickyHeader) with `DashboardSkeleton` immediately on initial mount, completely removing the full-screen `<Loader2 />` spinner. If client-side role check resolves to `STAFF`, perform smooth client-side redirection to `/` with an access alert toast.
- D2: Refactor `/dashboard` to Next.js Server Component + Suspense architecture (`src/app/dashboard/loading.tsx` rendering `DashboardSkeleton`, and `src/app/dashboard/page.tsx` as an async Server Component with `export const dynamic = 'force-dynamic'`), loading initial metrics server-side via server repository to eliminate client-side fetch waterfalls.
- D3: Month selection is driven by URL searchParams (`?month=YYYY-MM`), updated via `router.push` inside `useTransition`, providing instant month changes with native Next.js Server Component re-renders and smooth UI pending states.
- D4: Extract `src/server/repositories/dashboard-repo.ts` to implement clean data access for dashboard metrics: strictly bounded date ranges, optimized queries, eliminating unbounded 6-month nested joins, and retaining `/api/dashboard/route.ts` as a thin wrapper calling the repository for backwards compatibility and Bruno testing.

## System Decision Impact

- Impact: none
- Decision: none
- Acceptance gate: none

## Requirements

### Functional Requirements
- **FR-1 (Skeleton-Only Loading UX)**: When navigating to `/dashboard`, the user immediately sees the application chrome (Sidebar, Header) and the pulse `DashboardSkeleton`. No full-screen centering spinner is rendered at any point.
- **FR-2 (Staff Access Redirection)**: If a logged-in user has the `STAFF` role, they are redirected to `/` with an alert toast indicating insufficient permissions.
- **FR-3 (Server-Side Initial Metrics Fetching)**: The dashboard page server component directly loads the target month's metrics (`treasury`, `monthMetrics`, `chartData`, `topProducts`, `lowStockItems`, `recentExpenses`) via `getDashboardData(selectedDate)` in `src/server/repositories/dashboard-repo.ts`.
- **FR-4 (URL-Driven Month Filtering)**: The month selector updates `?month=YYYY-MM` via `router.push(..., { scroll: false })` wrapped in `useTransition()`. The active view displays a subtle pending indicator during month change without freezing the page.
- **FR-5 (Optimized Data Access Layer)**: `dashboard-repo.ts` performs bounded queries. The historical chart data only queries aggregate invoice totals per month without loading nested `invoice_items` or `products` across 6 months.
- **FR-6 (Backward Compatibility API Route)**: `/api/dashboard/route.ts` delegates metric retrieval to `dashboard-repo.ts` and returns standard JSON with `Cache-Control: private, no-cache, no-store`.

### Non-Functional Requirements
- **NFR-1 (Resilience & No Hangs)**: The page must never hang indefinitely on client or server. Database queries must be date-bounded and fail-safe.
- **NFR-2 (Strict TypeScript & Linting)**: Code must pass `npx tsc --noEmit` and `npm run build` with 0 ESLint and TypeScript errors.
- **NFR-3 (Consistent Design System)**: Preserve the existing visual aesthetic (dark/light mode, stat cards, charts, reorder alerts, and typography tokens).

## Acceptance Criteria

- [x] AC-1: Full-screen `<Loader2 />` spinner removed from `src/app/dashboard/page.tsx`. `src/app/dashboard/loading.tsx` renders `DashboardSkeleton` inside the page layout.
- [x] AC-2: `src/app/dashboard/page.tsx` refactored into an async Server Component with `export const dynamic = 'force-dynamic'`, accepting `searchParams: { month?: string }`.
- [x] AC-3: `src/components/dashboard/dashboard-client.tsx` extracted for client interactivity (month picker with `useTransition`, clipboard copy, and charts).
- [x] AC-4: `src/server/repositories/dashboard-repo.ts` created with `getDashboardData(date: Date)` providing bounded queries and $O(1)$ metric computation.
- [x] AC-5: `src/app/api/dashboard/route.ts` refactored to delegate to `dashboard-repo.ts` and verified with Bruno API runner.
- [x] AC-6: `STAFF` users accessing `/dashboard` are redirected to `/` with an error message toast.
- [x] AC-7: Production build `npm run build` passes with 0 errors.

## Scenarios

### Scenario 1: Initial Page Load by Facility Owner
**Given** an authenticated user with role `OWNER` or `MANAGER`
**When** the user navigates to `/dashboard`
**Then** `loading.tsx` immediately renders the sidebar, header, and skeleton cards, and streaming SSR completes with full metrics rendered with 0 full-screen spinners.

### Scenario 2: Month Switching with URL SearchParams
**Given** the dashboard is displaying metrics for the current month
**When** the user clicks the previous month button (`chevron_left`)
**Then** the URL updates to `?month=2026-09`, `useTransition` sets `isPending = true` (showing a small spinner in the month badge), and the server component streams the new month's data seamlessly without layout shift.

### Scenario 3: Unauthorized Access by Staff User
**Given** a user logged in with role `STAFF`
**When** the user opens or enters URL `/dashboard`
**Then** the client component detects the `STAFF` role and immediately redirects the user to `/?error=...`, preventing access to sensitive financial metrics.

### Scenario 4: Cold Cache / Fresh Month Navigation
**Given** a newly opened month with no pre-existing cache
**When** the server component loads metrics
**Then** `dashboard-repo.ts` executes bounded queries without loading full 6-month nested invoice items, returning metrics within sub-second latency.

## Technical Notes
- Follow Next.js App Router hybrid loading patterns as documented in `@doc/learnings/learning-nextjs-hybrid-data-loading`.
- Keep `src/components/dashboard/dashboard-client.tsx` client-only for `useTransition` and `useRouter` while keeping server data fetching in `src/app/dashboard/page.tsx`.
- Create/update Bruno request in `bruno/Dashboard/` to verify `/api/dashboard`.

## Open Questions
- None (all 4 design decisions locked during exploration).
