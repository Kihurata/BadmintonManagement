---
id: e0ghzz
title: Backend API for Recurring Booking Update and Deletion
status: done
priority: medium
labels:
  - from-spec
createdAt: '2026-06-29T06:12:28.270Z'
updatedAt: '2026-06-29T07:15:30.091Z'
timeSpent: 26
assignee: '@me'
spec: specs/recurring-bookings
fulfills:
  - AC-5
---
# Backend API for Recurring Booking Update and Deletion

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement DELETE and PUT /api/v1/bookings/recurring endpoints to manage series deletion and updates, supporting All or Future only scopes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement DELETE /api/v1/bookings/recurring endpoint supporting series scopes
- [x] #2 Implement PUT /api/v1/bookings/recurring endpoint propagating changes
- [x] #3 Verify series deletion scopes remove appropriate records
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor booking route /api/v1/bookings/recurring to support DELETE and PUT methods.
2. DELETE endpoint will support:
   - ruleId (URL or query parameter).
   - scope parameter: "FUTURE" (cancels only future bookings of the series) or "ALL" (cancels all bookings of the series).
3. PUT endpoint will update the recurring rule and future associated bookings (e.g. updating the customer or note, or propagating details).
4. Implement standard series update/delete helper logic using Supabase client.
5. Verify logic.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented PUT and DELETE /api/v1/bookings/recurring endpoints. Supports scopes ALL and FUTURE. Gracefully handles completed/checked_in bookings and cascading constraints.
<!-- SECTION:NOTES:END -->

