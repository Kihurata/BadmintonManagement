---
id: 8r062m
title: Frontend UI for Recurring Booking Listing and Management
status: done
priority: medium
labels:
  - from-spec
createdAt: '2026-06-29T06:12:28.286Z'
updatedAt: '2026-06-29T07:19:22.910Z'
timeSpent: 0
assignee: '@me'
spec: specs/recurring-bookings
fulfills:
  - AC-4
  - AC-5
---
# Frontend UI for Recurring Booking Listing and Management

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a list of active recurring rules in the Recurring Bookings tab for management, and update the calendar instance modification flow to warn when editing a recurring instance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement listing of active recurring rules in the tab
- [x] #2 Implement series deletion triggers from the tab list
- [x] #3 Add warning dialog to calendar single booking instance modification
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created RecurringBookingsTab with rules list and delete confirmation options (FUTURE / ALL). Updated single booking details warning dialog on schedule timeline edits/cancellations.
<!-- SECTION:NOTES:END -->

