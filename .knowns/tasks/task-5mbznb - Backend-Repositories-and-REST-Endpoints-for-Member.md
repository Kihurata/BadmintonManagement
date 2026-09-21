---
id: 5mbznb
title: 'Backend Repositories and REST Endpoints for Members & Split Allocation'
status: done
priority: high
labels: []
createdAt: '2026-09-08T07:49:21.044Z'
updatedAt: '2026-09-10T08:37:57.756Z'
completedAt: '2026-09-10T08:37:57.756Z'
timeSpent: 0
assignee: '@me'
spec: specs/simplified-bill-splitting
fulfills:
  - AC-2
  - AC-3
---
# Backend Repositories and REST Endpoints for Members & Split Allocation

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create src/server/repositories/member-repo.ts
- [x] #2 Update split-repo.ts and invoice-repo.ts to support member allocation
- [x] #3 Create GET/POST /api/v1/members endpoint
- [x] #4 Update POST /api/invoices/items to support allocationType and assignedMemberId
- [x] #5 Update Bruno tests in bruno/GroupAndSplit
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed member-repo.ts, split-repo.ts, invoice-repo.ts, REST endpoints GET/POST/PUT /api/v1/members, item allocation in invoice items, and Bruno tests.
<!-- SECTION:NOTES:END -->

