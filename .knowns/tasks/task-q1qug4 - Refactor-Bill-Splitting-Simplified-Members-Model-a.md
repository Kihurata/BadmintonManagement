---
id: q1qug4
title: 'Refactor Bill Splitting: Simplified Members Model and Direct Booking POS Flow'
status: done
priority: high
labels: []
createdAt: '2026-09-08T07:35:43.027Z'
updatedAt: '2026-09-08T07:50:35.043Z'
completedAt: '2026-09-08T07:50:35.043Z'
timeSpent: 0
assignee: '@me'
---
# Refactor Bill Splitting: Simplified Members Model and Direct Booking POS Flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor bill splitting: replace host-customer dependency with general tenant members table, add direct attendant selection to booking details, prompt allocation choices (shared vs individual) when adding items, and compute the split breakdown in checkout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create migration for tenant members table and update invoice_split_attendance, invoice_items, and invoice_split_summary view
- [ ] #2 Create member-repo.ts and update split-repo.ts & invoice-repo.ts to support member allocation
- [ ] #3 Add attendant member selection and quick-add inside Booking Details dialog
- [ ] #4 Add Item Allocation Popup when clicking products in Menu (Shared vs Specific Member)
- [ ] #5 Display dynamic bill split breakdown in CheckoutForm (Court fee + Global shared items / N + individual items)
- [ ] #6 Verify clean build with npm run build without TypeScript or ESLint errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create database migration for tenant members, update attendance & items foreign keys, and recreate invoice_split_summary view
2. Create member-repo.ts and update split-repo.ts & invoice-repo.ts
3. Create GET/POST /api/v1/members and update POST /api/invoices/items
4. Build AttendantSelectorDialog and ItemAllocationDialog components
5. Integrate attendant selection & item allocation popup into booking-details.tsx
6. Integrate dynamic split summary card and Zalo export into checkout-form.tsx
7. Run build verification (npm run build) and update Bruno tests
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Broken down into granular SDD tasks: 4f4crx (Database), 5mbznb (Backend), daquql (Frontend)
<!-- SECTION:NOTES:END -->

