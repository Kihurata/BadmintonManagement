---
id: r6c9t3
title: Refactor Customer Selector in BookingForm to use Props
status: done
priority: medium
labels:
  - normal
createdAt: '2026-06-30T06:12:15.962Z'
updatedAt: '2026-06-30T06:55:18.067Z'
timeSpent: 185
assignee: '@me'
---
# Refactor Customer Selector in BookingForm to use Props

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor booking-form.tsx to accept customers as a prop (similar to courts) instead of fetching them client-side in useEffect, aligning with the project's Next.js Hybrid Data Loading Pattern. Update callers to pre-fetch and pass customers down.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: Refactored BookingForm and RecurringBookingForm to accept customers as a prop. Updated pages/containers (HomePage, SchedulePage, HomeClient, ScheduleClient, RecurringBookingsTab) to prefetch customers server-side and propagate them down. Passed validation and Next.js build.
📚 Extracted to @doc/learnings/learning-nextjs-hybrid-data-loading
<!-- SECTION:NOTES:END -->

