---
id: cyxdsc
title: Refactor Frontend Components to call RESTful Products API
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-06-20T08:49:39.793Z'
updatedAt: '2026-06-23T17:36:45.769Z'
timeSpent: 131
assignee: '@me'
spec: specs/rest-products-api
---
# Refactor Frontend Components to call RESTful Products API

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update Client Components to call new RESTful products endpoints and ensure Server Components call repositories directly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Refactor quick-sale-form.tsx to use /api/v1/products
- [x] #2 Refactor booking-details.tsx to use /api/v1/products
- [x] #3 Refactor invoice-detail-dialog.tsx to use /api/v1/products
- [x] #4 Verify Server Components bypass HTTP API calls
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cap nhat fetch trong quick-sale-form.tsx, booking-details.tsx, invoice-detail-dialog.tsx sang /api/v1/products. 2. Cap nhat test mock trong bookings.test.tsx. 3. Chay npm test va npm run build.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Refactored Client Components (quick-sale-form.tsx, booking-details.tsx, invoice-detail-dialog.tsx) to query products from /api/v1/products REST API. Updated fetch mocks in bookings.test.tsx. Verified that all tests passed and Next.js builds successfully. Verified that Server Components query repositories directly.
<!-- SECTION:NOTES:END -->

