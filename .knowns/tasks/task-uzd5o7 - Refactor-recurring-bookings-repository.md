---
id: uzd5o7
title: Refactor recurring bookings repository
status: done
priority: medium
labels: []
createdAt: '2026-06-29T09:21:49.399Z'
updatedAt: '2026-06-29T09:29:50.675Z'
timeSpent: 470
assignee: '@me'
---
# Refactor recurring bookings repository

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract raw database access logic from `src/app/api/v1/bookings/recurring/route.ts` into `src/server/repositories/booking-repo.ts`. Updates unit tests to mock repository functions rather than raw database client.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Extract conflict detection to checkRecurringConflicts in booking-repo.ts
- [x] #2 Extract creation series to createRecurringBookings in booking-repo.ts
- [x] #3 Extract deletion series to deleteRecurringBookings in booking-repo.ts
- [x] #4 Extract update series to updateRecurringBookings in booking-repo.ts
- [x] #5 Refactor recurring/route.ts handlers to use the repo functions
- [x] #6 Update recurring-bookings.test.ts unit tests to mock repo functions
- [x] #7 Verification via Jest and Bruno integration tests passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add conflict checking, creation, deletion, and update helper methods to booking-repo.ts
2. Refactor POST, PUT, DELETE route handlers in recurring/route.ts to use booking-repo.ts functions
3. Refactor recurring-bookings.test.ts to mock booking-repo.ts repository methods
4. Validate and verify via Jest and Bruno
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: Extracted conflict checking, creation, deletion, and update helper methods to booking-repo.ts. Refactored createBooking to use resolveGuestCustomerId helper.
Done: Refactored route.ts handlers (POST, PUT, DELETE) to use the new booking-repo.ts methods.
Done: Refactored tests/api/recurring-bookings.test.ts to mock booking-repo.ts methods. Added a test covering successful creation of recurring bookings.
Done: Run Jest tests and Bruno integration tests, both pass. Dev server killed and environment cleaned up.
<!-- SECTION:NOTES:END -->

