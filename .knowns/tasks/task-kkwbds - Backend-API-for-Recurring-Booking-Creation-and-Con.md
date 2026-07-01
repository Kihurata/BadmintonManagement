---
id: kkwbds
title: Backend API for Recurring Booking Creation and Conflict Detection
status: done
priority: high
labels:
  - from-spec
createdAt: '2026-06-29T06:12:28.254Z'
updatedAt: '2026-06-29T06:30:18.031Z'
timeSpent: 114
assignee: '@me'
spec: specs/recurring-bookings
fulfills:
  - AC-2
  - AC-3
---
# Backend API for Recurring Booking Creation and Conflict Detection

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement POST /api/v1/bookings/recurring endpoint to handle recurring booking creation. It must check for conflicts with existing bookings. If conflicts exist, return a list. Upon confirmation, create the rule and generate individual bookings in a transaction.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement POST /api/v1/bookings/recurring endpoint
- [x] #2 Add overlapping conflict checking logic
- [x] #3 Implement transactional creation of recurring_rules and matching bookings
- [x] #4 Verify conflict results match scenarios
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define Postgres RPC create_recurring_bookings to create a recurring rule and its bookings transactionally (and optionally cancel overlaps).
2. Create src/app/api/v1/bookings/recurring/route.ts POST handler.
3. Add candidate date generation logic and in-memory overlap checking.
4. Integrate with verifyUserRole to handle permissions for overwrite.
5. Invoke RPC to execute transaction.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented POST /api/v1/bookings/recurring with validation, date generation, conflict checks, and transaction RPC call.
<!-- SECTION:NOTES:END -->

