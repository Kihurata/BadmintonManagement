---
id: euw0sz
title: 'Refactor Products & Customers to Server Components and Fix PWA Cache'
status: done
priority: high
labels: []
createdAt: '2026-10-08T07:31:50.177Z'
updatedAt: '2026-10-08T07:42:24.817Z'
completedAt: '2026-10-08T07:42:24.817Z'
timeSpent: 0
assignee: '@me'
---
# Refactor Products & Customers to Server Components and Fix PWA Cache

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor /products and /customers into Server Components with dynamic = 'force-dynamic' and harden PWA runtimeCaching in next.config.mjs to eliminate 304 navigation bugs
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Refactor src/app/products/page.tsx into Server Component with force-dynamic and initialProducts prop
- [x] #2 Refactor src/app/customers/page.tsx into Server Component with force-dynamic and initialCustomers prop
- [x] #3 Update ProductList and CustomerList to accept initial data and support router.refresh() on mutations
- [x] #4 Harden next.config.mjs to exclude /api and supabase cross-origin from SW caching and disable generateEtags
- [x] #5 Verify clean build with npm run build and 0 TypeScript/ESLint errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract ProductsClient in src/components/products/products-client.tsx and update ProductList to accept initialProducts with router.refresh() synchronization
2. Refactor src/app/products/page.tsx into async Server Component with export const dynamic = 'force-dynamic' fetching products via product-repo
3. Update CustomerList in src/components/customers/customer-list.tsx to accept initialCustomers and sync with router.refresh()
4. Refactor src/app/customers/page.tsx into async Server Component with export const dynamic = 'force-dynamic' fetching customers via product-repo
5. Harden next.config.mjs with generateEtags: false and configure runtimeCaching with NetworkOnly for /api/ and Supabase endpoints
6. Run npm run build and npm test to verify 0 TypeScript/ESLint errors and passing test suite
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Refactored /products and /customers to Server Components with dynamic = force-dynamic and server repository loading. Hardened next.config.mjs with generateEtags: false and NetworkOnly Workbox runtimeCaching for /api/ and Supabase endpoints. Verified with npm run build (0 errors) and npm test (41/41 passing across 6 test suites).
<!-- SECTION:NOTES:END -->

