---
id: 2ldea5
title: Refactor Schedule Page and Booking GET API to Data Access Layer
status: in-progress
priority: medium
labels: []
createdAt: '2026-07-23T10:33:57.309Z'
updatedAt: '2026-07-23T10:34:10.430Z'
timeSpent: 0
assignee: '@me'
---
# Refactor Schedule Page and Booking GET API to Data Access Layer

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor raw Supabase queries in Schedule page (courts, customers) and GET /api/bookings endpoint into server repositories (booking-repo, court-repo, customer-repo) for Clean Architecture consistency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create court-repo.ts and customer-repo.ts server repository functions
- [ ] #2 Add getBookingsByDateRange function to booking-repo.ts
- [ ] #3 Refactor Schedule page (src/app/schedule/page.tsx) to fetch courts and customers via server repositories
- [ ] #4 Refactor GET /api/bookings Route Handler to fetch bookings via booking-repo
- [ ] #5 Ensure clean build with npm run build without TypeScript or ESLint errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create court-repo.ts (getAllCourts) and customer-repo.ts (getAllCustomers) in src/server/repositories/
2. Export getBookingsByDateRange(start, end) in src/server/repositories/booking-repo.ts
3. Update src/app/schedule/page.tsx to use server repositories instead of raw Supabase client
4. Update GET handler in src/app/api/bookings/route.ts to use getBookingsByDateRange
5. Run build and typecheck verification (npm run build)
<!-- SECTION:PLAN:END -->

