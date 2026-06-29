---
id: tlqg6i
title: 'Protect Navigation Menus (Sidebar & BottomNav)'
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:34:44.189Z'
updatedAt: '2026-05-24T09:35:57.052Z'
timeSpent: 15
spec: specs/staff-access-control
---
# Protect Navigation Menus (Sidebar & BottomNav)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integrate useUserRole in sidebar.tsx and bottom-nav.tsx. Hide Báo cáo for STAFF. Show actual email/role in Sidebar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Integrate hook in Sidebar and BottomNav
- [x] #2 Hide Báo cáo tab for STAFF
- [x] #3 Display email and translated role (Nhân viên/Quản lý) in Sidebar
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Edit sidebar.tsx: integrate useUserRole hook, filter Báo cáo menu, display dynamic profile email and role label
2. Edit bottom-nav.tsx: integrate useUserRole hook, filter Báo cáo menu
3. Verify UI renders correctly without issues.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Integrated useUserRole in Sidebar and BottomNav components. Hidden Dashboard page link for STAFF users. Displays user email and translated role name in Sidebar footer.
<!-- SECTION:NOTES:END -->

