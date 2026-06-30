---
id: siv8jj
title: Build PaymentSelector component
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:30:45.849Z'
updatedAt: '2026-05-24T09:41:03.538Z'
timeSpent: 5
spec: specs/optimize-and-unify-invoice-components
fulfills:
  - AC-4
---
# Build PaymentSelector component

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a presentational payment method selector component that handles Cash/Bank selection and displays VietQR.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement presentational component PaymentSelector with VietQR support
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/components/invoices/payment-selector.tsx
2. Render Cash and Bank options
3. Display VietQR dynamically via invoice-utils.ts
4. Export component
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Built PaymentSelector component under src/components/invoices/payment-selector.tsx
<!-- SECTION:NOTES:END -->

