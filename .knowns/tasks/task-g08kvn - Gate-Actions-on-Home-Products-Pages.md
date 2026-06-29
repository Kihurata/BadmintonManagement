---
id: g08kvn
title: 'Gate Actions on Home & Products Pages'
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:34:46.930Z'
updatedAt: '2026-05-24T09:36:32.477Z'
timeSpent: 29
spec: specs/staff-access-control
---
# Gate Actions on Home & Products Pages

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hide Nhập chi phí button on home page for STAFF. Hide Lịch sử kho tab and stock adjustment swap icon on Products page for STAFF.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hide Nhập chi phí on Home page for STAFF
- [x] #2 Hide Lịch sử kho tab on Products page for STAFF
- [x] #3 Hide Stock adjustment icon on Products page for STAFF
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Edit quick-actions.tsx: check useUserRole, conditionally render the Nhập chi phí button
2. Edit products/page.tsx: check useUserRole, conditionally render Lịch sử kho tab button and swap_vert stock adjustment button
3. Verify everything builds without compilation errors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Gated Quick Actions on Home page and Products page for STAFF users. Hidden Nhập chi phí, Lịch sử kho tab, and Stock adjustment button. Also restricted day-end chốt ca and Công nợ (debt ledger) on Invoices page.
<!-- SECTION:NOTES:END -->

