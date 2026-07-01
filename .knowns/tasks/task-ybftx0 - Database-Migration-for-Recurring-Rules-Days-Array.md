---
id: ybftx0
title: Database Migration for Recurring Rules Days Array
status: done
priority: medium
labels:
  - from-spec
createdAt: '2026-06-29T06:12:27.880Z'
updatedAt: '2026-06-29T06:24:36.589Z'
timeSpent: 645
assignee: '@me'
spec: specs/recurring-bookings
fulfills:
  - AC-1
---
# Database Migration for Recurring Rules Days Array

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement SQL migration to replace day_of_week with days_of_week integer[] in recurring_rules. Ensure RLS policies and automatic tenant_id trigger are properly attached.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create migration file for updating recurring_rules to days_of_week array
- [x] #2 Ensure RLS policies and automatic tenant_id triggers are verified
- [x] #3 Apply migration successfully to database
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Execute SQL to add days_of_week integer[] to recurring_rules, copy existing day_of_week values into array format, and drop day_of_week.
2. Verify triggers and RLS policies.
3. Generate the migration file using `supabase db pull`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed migration, applied DDL changes, and generated migration file.
<!-- SECTION:NOTES:END -->

