---
id: yw8mii
title: Create DashboardClient and Loading Skeleton Component
status: done
priority: high
labels:
  - from-spec
  - go-mode
createdAt: '2026-10-08T08:52:41.898Z'
updatedAt: '2026-10-08T09:02:19.297Z'
completedAt: '2026-10-08T08:57:39.304Z'
timeSpent: 0
assignee: '@me'
spec: specs/fix-dashboard-loading-and-caching
fulfills:
  - AC-1
  - AC-3
  - AC-6
---
# Create DashboardClient and Loading Skeleton Component

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract src/components/dashboard/dashboard-client.tsx with useTransition for month selection and STAFF role redirection. Create src/app/dashboard/loading.tsx with DashboardSkeleton and remove full-screen Loader2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create src/app/dashboard/loading.tsx with DashboardSkeleton inside page layout
- [x] #2 Create src/components/dashboard/dashboard-client.tsx handling month navigation and STAFF redirection
- [x] #3 Remove full-screen Loader2 spinner completely
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/app/dashboard/loading.tsx rendering DashboardSkeleton with StickyHeader, Sidebar, and pulse cards
2. Extract src/components/dashboard/dashboard-client.tsx containing the interactive UI: month switcher using useTransition and router.push(?month=...), reorder copy handler, treasury cards, P&L, chart, top products, and recent expenses
3. Integrate role check and STAFF redirection into dashboard-client.tsx with toast message
4. Completely eliminate the full-screen Loader2 spinner
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created src/app/dashboard/loading.tsx rendering DashboardSkeleton with full layout. Created src/components/dashboard/dashboard-client.tsx with useTransition month navigation and smooth pending state, eliminating the full-screen Loader2 spinner entirely.

Spec Decision Compliance: D1=pass, D2=pass, D3=pass, D4=pass

System Decision Impact: none — Dashboard loading performance and skeleton UX fix requires no changes to durable system guidance
<!-- SECTION:NOTES:END -->

