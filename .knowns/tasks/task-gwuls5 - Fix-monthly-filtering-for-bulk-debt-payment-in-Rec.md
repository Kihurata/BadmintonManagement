---
id: gwuls5
title: Fix monthly filtering for bulk debt payment in Receivables Ledger
status: done
priority: high
labels: []
createdAt: '2026-08-08T09:44:30.536Z'
updatedAt: '2026-08-08T09:54:18.425Z'
timeSpent: 0
assignee: '--plain'
---
# Fix monthly filtering for bulk debt payment in Receivables Ledger

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update ReceivablesLedger modal footer button text to 'Thu nợ (amount)' based on filtered month and pay only selected invoices via API
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend POST /api/invoices/pay-all to support invoice_ids array
2. Update openPaymentModal and confirmPayment in receivables-ledger.tsx
3. Update modal footer button text to Thu nợ (filteredTotalDebt)
4. Add Bruno test and verify build via npm run build
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented optional invoice_ids parameter in POST /api/invoices/pay-all route handler. Updated ReceivablesLedger to update footer button to 'Thu nợ (amount)' when filtered by month and pass invoice_ids to pay-all API. Added Bruno test and verified clean production build with npm run build.
<!-- SECTION:NOTES:END -->

