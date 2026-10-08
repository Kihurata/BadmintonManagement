---
id: 6i4xpb
title: Migrate Customers API to /api/v1/customers
status: done
priority: medium
labels: []
createdAt: '2026-10-08T07:44:13.474Z'
updatedAt: '2026-10-08T07:47:14.991Z'
completedAt: '2026-10-08T07:47:14.991Z'
timeSpent: 0
assignee: '@me'
---
# Migrate Customers API to /api/v1/customers

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move Customers Route Handler from /api/customers to /api/v1/customers, update frontend callers, add Bruno collection, and verify tests
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create src/app/api/v1/customers/route.ts with force-dynamic and Cache-Control headers
- [x] #2 Update frontend callers in booking-form, quick-sale-form, and recurring-booking-form to /api/v1/customers
- [x] #3 Create Bruno request bruno/Customers/Get Customers.bru
- [x] #4 Verify clean build and test suite passing
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved customer endpoint to /api/v1/customers with force-dynamic and Cache-Control. Updated all callers (booking-form, quick-sale-form, recurring-booking-form), updated test mocks, created bruno/Customers/Get Customers.bru, verified with npm test (41/41 passing) and npm run build (0 errors).
<!-- SECTION:NOTES:END -->

