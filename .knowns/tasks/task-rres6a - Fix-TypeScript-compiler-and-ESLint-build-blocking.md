---
id: rres6a
title: Fix TypeScript compiler and ESLint build-blocking errors
status: done
priority: high
labels: []
createdAt: '2026-06-29T14:25:43.930Z'
updatedAt: '2026-06-29T14:44:52.376Z'
timeSpent: 357
---
# Fix TypeScript compiler and ESLint build-blocking errors

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve build-blocking unused vars, explicit any types, and React Hook missing dependencies to ensure npm run build succeeds
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove unused variables from components
2. Replace explicit any casts with strict types in booking-repo.ts
3. Verify with npm run build
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed unused destructured role variable and useUserRole/vi imports in frontend files. Replaced explicit any cast on customers property in booking-repo.ts with type check and union type cast. Fixed payload type definitions. Production build successful.
📚 Extracted to @doc/learnings/learning-typescript-strict-compilation
<!-- SECTION:NOTES:END -->

