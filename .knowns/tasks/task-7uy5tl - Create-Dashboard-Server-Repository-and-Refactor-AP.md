---
id: 7uy5tl
title: Create Dashboard Server Repository and Refactor API Route
status: done
priority: high
labels:
  - from-spec
  - go-mode
createdAt: '2026-10-08T08:52:36.103Z'
updatedAt: '2026-10-08T09:02:19.031Z'
completedAt: '2026-10-08T08:55:13.371Z'
timeSpent: 0
assignee: '@me'
spec: specs/fix-dashboard-loading-and-caching
fulfills:
  - AC-4
  - AC-5
---
# Create Dashboard Server Repository and Refactor API Route

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/server/repositories/dashboard-repo.ts with bounded queries for tenant balances, month metrics, recent expenses, and low stock items. Refactor /api/dashboard/route.ts to delegate to dashboard-repo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create src/server/repositories/dashboard-repo.ts with getDashboardData function
- [x] #2 Refactor src/app/api/dashboard/route.ts to use dashboard-repo
- [x] #3 Verify /api/dashboard with Bruno or unit tests
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/server/repositories/dashboard-repo.ts with getDashboardData(date: Date) function
2. Implement bounded queries: tenant_balances, products, month metrics, recent transactions (expenses), and low stock items
3. Refactor src/app/api/dashboard/route.ts to delegate to dashboard-repo.ts
4. Verify types and ensure clean exports
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created src/server/repositories/dashboard-repo.ts with bounded queries and O(1) balance lookups. Refactored src/app/api/dashboard/route.ts to force-dynamic delegating to dashboard-repo. Passed tsc and npm test.

Spec Decision Compliance: D1=pass, D2=pass, D3=pass, D4=pass

System Decision Impact: none — Dashboard loading performance and skeleton UX fix requires no changes to durable system guidance
<!-- SECTION:NOTES:END -->

