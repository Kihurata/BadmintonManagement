---
id: 0gih9b
title: Implement RESTful Write Endpoints for Products
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-06-20T08:49:37.201Z'
updatedAt: '2026-06-23T17:32:06.062Z'
timeSpent: 260751
assignee: '@me'
spec: specs/rest-products-api
fulfills:
  - AC-5
  - AC-7
---
# Implement RESTful Write Endpoints for Products

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement POST, PUT, PATCH, and DELETE handlers for products under /api/v1/products, integrating RBAC and constraint error handling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement POST /api/v1/products (return 201)
- [x] #2 Implement PUT /api/v1/products/[productId] for full update
- [x] #3 Implement PATCH /api/v1/products/[productId] for partial update
- [x] #4 Implement DELETE /api/v1/products/[productId] and return 409 Conflict if product is referenced
- [x] #5 Integrate RBAC helper to restrict STAFF write requests with 403
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/lib/product-validator.ts to handle full and partial validation. 2. Implement POST in products/route.ts catching JSON parse errors (400) and validating with helper. 3. Implement PUT, PATCH, DELETE in products/[productId]/route.ts with validation, RBAC, and conflict mapping. 4. Write tests/api/products.test.ts to verify errors and normal flow. 5. Run npm test and npm run build.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented RESTful product API write endpoints (POST, PUT, PATCH, DELETE) with body parse try-catch protection (returning 400 Bad Request on parse fail), a clean reusable validation utility in product-validator.ts, RBAC checks, and 409 Conflict mapping for referenced products in DELETE.
📚 Extracted to @doc/learnings/learning-rest-products-api
<!-- SECTION:NOTES:END -->

