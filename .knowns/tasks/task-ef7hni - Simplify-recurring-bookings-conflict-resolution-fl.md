---
id: ef7hni
title: Simplify recurring bookings conflict resolution flow
status: done
priority: high
labels:
  - refactor
createdAt: '2026-06-29T08:51:32.538Z'
updatedAt: '2026-06-29T09:02:35.292Z'
timeSpent: 659
assignee: '@me'
spec: specs/recurring-bookings
---
# Simplify recurring bookings conflict resolution flow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Simplify conflict resolution behavior for recurring bookings. If conflicts exist, return a conflict warning list. Remove overwrite and skip options from both backend API and frontend conflict modal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create new migration for simplified Supabase RPC.
2. Update Next.js route.ts to invoke new RPC and remove overwrite/skip logic.
3. Remove overwrite/skip buttons from recurring-booking-form.tsx UI dialog.
4. Adapt unit and integration tests, and update API docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dropped p_overwrite_ids from create_recurring_bookings RPC. Simplified Next.js POST endpoint, frontend conflict modal UI, Jest unit tests, Bruno collections, and API specs to exit immediately with conflicts.
<!-- SECTION:NOTES:END -->

