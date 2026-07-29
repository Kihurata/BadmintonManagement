---
id: t2j3or
title: 'Optimize Dashboard Performance & Caching Strategy'
status: done
priority: high
labels: []
createdAt: '2026-07-29T12:42:41.242Z'
updatedAt: '2026-07-29T12:51:19.314Z'
timeSpent: 0
assignee: '@me'
---
# Optimize Dashboard Performance & Caching Strategy

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor Next.js dashboard route handler (src/app/api/dashboard/route.ts) to fix unstable_cache invalidation bugs, partition caching by data volatility, and add cache invalidation tags.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix unstable_cache key serialization
2. Partition dashboard caching into 4 volatility tiers
3. Add revalidateTag hooks to payment handlers
4. Add Bruno test & verify build
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented tiered unstable_cache in src/app/api/dashboard/route.ts. Added revalidateTag in pay-all route. Created Bruno test bruno/Dashboard/Get Dashboard Metrics.bru. Passed Next.js production build and Bruno API runner.
<!-- SECTION:NOTES:END -->

