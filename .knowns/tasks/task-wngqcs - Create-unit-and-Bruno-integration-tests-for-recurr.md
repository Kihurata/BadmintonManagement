---
id: wngqcs
title: Create unit and Bruno integration tests for recurring bookings
status: done
priority: medium
labels:
  - testing
createdAt: '2026-06-29T08:15:48.222Z'
updatedAt: '2026-06-29T08:21:36.350Z'
timeSpent: 188
spec: specs/recurring-bookings
---
# Create unit and Bruno integration tests for recurring bookings

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create backend unit tests for route handlers and write Bruno integration tests under Bruno collection directory to cover creation, conflict scenarios (skip, overwrite), updates, and deletion scopes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create tests/api/recurring-bookings.test.ts unit test suite.
2. Mock auth roles and Supabase client DB operations/RPCs.
3. Write test cases for POST, PUT, DELETE endpoints including schema validation, conflict overlap checks, skip/overwrite flags, and deletion scopes.
4. Create bruno/RecurringBookings/ collection files including Create, Conflict, Skip, Update, and Delete requests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created Jest unit tests in tests/api/recurring-bookings.test.ts and 5 Bruno integration requests under bruno/RecurringBookings/.
<!-- SECTION:NOTES:END -->

