---
id: lrc57b
title: Integrate unified components into CheckoutForm and InvoiceDetailDialog
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:30:45.923Z'
updatedAt: '2026-05-24T09:41:03.613Z'
timeSpent: 408
spec: specs/optimize-and-unify-invoice-components
fulfills:
  - AC-1
---
# Integrate unified components into CheckoutForm and InvoiceDetailDialog

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor CheckoutForm and InvoiceDetailDialog to use the new InvoiceSummaryCard and PaymentSelector components, removing duplicated code.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CheckoutForm refactored to use new card and payment selector
- [x] #2 InvoiceDetailDialog refactored to use new card and payment selector
- [x] #3 Verify type compilation passes clean
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modify CheckoutForm to use InvoiceSummaryCard and PaymentSelector
2. Modify InvoiceDetailDialog to use InvoiceSummaryCard, PaymentSelector, and formatInvoiceShareText
3. Modify QuickSaleForm to use PaymentSelector
4. Verify code compiling and work fine
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Integrate unified components into CheckoutForm and InvoiceDetailDialog. Types fix completed and Next.js compiler errors resolved.
<!-- SECTION:NOTES:END -->

