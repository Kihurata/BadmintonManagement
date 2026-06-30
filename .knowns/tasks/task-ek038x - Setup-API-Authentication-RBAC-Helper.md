---
id: ek038x
title: 'Setup API Authentication & RBAC Helper'
status: done
priority: high
labels:
  - from-spec
  - go-mode
createdAt: '2026-06-20T08:49:32.328Z'
updatedAt: '2026-06-20T08:54:50.113Z'
timeSpent: 123
assignee: '@me'
spec: specs/rest-products-api
fulfills:
  - AC-6
---
# Setup API Authentication & RBAC Helper

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement helper function or update middleware to authenticate requests and verify user roles for API Route Handlers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create src/lib/api-auth.ts for role verification
- [x] #2 Update middleware to return 401 JSON for unauthenticated api/v1 routes
- [x] #3 Ensure role is fetched from user_roles table using auth.uid()
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/lib/api-auth.ts to check authentication and role. 2. Modify src/utils/supabase/middleware.ts to return JSON 401 for unauthorized /api/ routes. 3. Test locally.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented api-auth helper and modified middleware to return 401 JSON for unauthorized /api/ routes.
<!-- SECTION:NOTES:END -->

