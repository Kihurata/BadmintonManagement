---
id: yzogpn
title: 'Setup React Auth Context & Role Hook'
status: done
priority: high
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:34:41.297Z'
updatedAt: '2026-05-24T09:35:37.099Z'
timeSpent: 37
spec: specs/staff-access-control
---
# Setup React Auth Context & Role Hook

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implements AuthProvider / useUserRole hook fetching user role from user_roles and user email from supabase auth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create useUserRole context/hook
- [x] #2 Fetch role from user_roles
- [x] #3 Expose role, email, and loading
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/components/auth-provider.tsx containing AuthProvider and useUserRole context
2. Modify src/app/layout.tsx to include AuthProvider wrapper
3. Verify everything builds without compilation errors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented AuthProvider and useUserRole hook. Successfully queries user_roles table in Supabase. Wrapped RootLayout in layout.tsx. Verified build compilation passes.
<!-- SECTION:NOTES:END -->

