---
id: oxmnnl
title: Refactor Frontend Pages and Components to DAL
status: done
priority: high
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-25T10:07:44.602Z'
updatedAt: '2026-05-25T10:15:38.947Z'
timeSpent: 328
spec: specs/data-access-layer-refactor
fulfills:
  - AC-1
  - AC-4
---
# Refactor Frontend Pages and Components to DAL

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor Dashboard, Schedule, Invoices, and Booking components to use Server Components for reads, API routes for mutations, and the realtime wrapper service.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Refactor Page files to Server Components
- [x] #2 Refactor Dialogs/Forms to use API routes
- [x] #3 Remove direct supabase.from usage in client components
- [x] #4 Update unit tests and verify all green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Successfully refactored all remaining invoice components (receivables-ledger, transaction-history, invoice-detail-dialog) to DAL API endpoints and verified all unit tests pass.
<!-- SECTION:NOTES:END -->

