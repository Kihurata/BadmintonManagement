---
id: h43pew
title: Display guest name for walk-in bookings
status: done
priority: medium
labels:
  - normal
createdAt: '2026-07-12T05:15:38.603Z'
updatedAt: '2026-07-12T06:13:19.406Z'
timeSpent: 3446
assignee: me
---
# Display guest name for walk-in bookings

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Them hien thi ten cua khach choi vang lai khi thuc hien dat san va hien thi tren Timeline/chi tiet/thanh toan
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add guest_name column to bookings table via local SQL migration.
2. Update booking-repo.ts to include guest_name in types and insert/conflict query mappings.
3. Update API endpoints /api/bookings (GET/POST) to query and save guest_name.
4. Update frontend booking-form.tsx to conditionally display a 'Tên khách vãng lai' text input and pass it to API.
5. Update timeline.tsx to query and display the guest name if customer type is GUEST.
6. Update booking-details.tsx and checkout-form.tsx to render the guest name properly.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented guest name display logic in repository, API route, and frontend forms/timeline components. Verified that database migrations apply cleanly via MCP, and Next.js builds successfully.
<!-- SECTION:NOTES:END -->

