---
id: asymi9
title: 'Client-side Route Protection for Dashboard & Onboarding'
status: done
priority: high
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:34:48.501Z'
updatedAt: '2026-05-24T09:37:08.938Z'
timeSpent: 32
spec: specs/staff-access-control
---
# Client-side Route Protection for Dashboard & Onboarding

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Intercept access to /dashboard and /onboarding routes for STAFF. Redirect to / with Toast error message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Block direct /dashboard access for STAFF and redirect with Toast
- [x] #2 Block direct /onboarding access for STAFF and redirect with Toast
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented client-side route protection for /dashboard and /onboarding pages. If a STAFF user attempts direct access, they are redirected to / with an alert message.
<!-- SECTION:NOTES:END -->

