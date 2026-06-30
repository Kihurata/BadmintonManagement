---
id: 3dcrab
title: Create Centralized Realtime Client Service
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-25T10:07:41.131Z'
updatedAt: '2026-05-25T10:10:00.826Z'
timeSpent: 16
spec: specs/data-access-layer-refactor
fulfills:
  - AC-3
---
# Create Centralized Realtime Client Service

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement src/lib/services/realtime-service.ts to encapsulate Supabase client-side WebSocket subscription, mapping postgres changes to clean UI updates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create realtime-service.ts/hook
- [x] #2 Expose clean subscription APIs
<!-- AC:END -->

