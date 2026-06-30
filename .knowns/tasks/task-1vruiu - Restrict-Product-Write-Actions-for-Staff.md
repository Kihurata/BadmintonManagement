---
id: 1vruiu
title: Restrict Product Write Actions for Staff
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-25T08:06:14.089Z'
updatedAt: '2026-05-25T08:07:17.208Z'
timeSpent: 58
spec: specs/staff-access-control
---
# Restrict Product Write Actions for Staff

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In ProductList component, check user role. If role is STAFF, hide the add product button and the edit/delete action buttons for products.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Import useUserRole in ProductList
- [x] #2 Hide Add Product button for STAFF
- [x] #3 Hide Edit and Delete buttons for STAFF
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Edit product-list.tsx: import useUserRole, conditionally render Add button and Edit/Delete action buttons
2. Verify everything compiles and passes tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Modified product-list.tsx to use useUserRole. Hidden the Add button, Edit, and Delete action buttons when the logged-in user role is STAFF.
<!-- SECTION:NOTES:END -->

