---
id: ebc7o7
title: Implement Monthly Renewal for Recurring Rules
status: done
priority: high
labels: []
createdAt: '2026-08-08T10:08:23.681Z'
updatedAt: '2026-08-08T16:45:08.709Z'
timeSpent: 0
assignee: '--plain'
---
# Implement Monthly Renewal for Recurring Rules

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add API endpoint POST /api/v1/bookings/recurring/renew and UI button 'Gia hạn tháng sau' in Lịch Cố Định tab
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add renewRecurringRule repository function in recurring-repo.ts
2. Create POST /api/v1/bookings/recurring/renew Route Handler
3. Add Gia hạn tháng sau button and preview modal to recurring-bookings-tab.tsx
4. Add Bruno test file and verify build with npm run build
<!-- SECTION:PLAN:END -->

