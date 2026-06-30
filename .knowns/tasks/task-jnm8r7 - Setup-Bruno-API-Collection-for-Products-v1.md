---
id: jnm8r7
title: Setup Bruno API Collection for Products v1
status: done
priority: medium
labels: []
createdAt: '2026-06-27T08:44:47.241Z'
updatedAt: '2026-06-27T08:52:56.517Z'
timeSpent: 230
assignee: '@me'
---
# Setup Bruno API Collection for Products v1

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create Bruno collection, environment configurations, and requests to test and document all v1 product API endpoints.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create Bruno collection folder and config. 2. Define Local environment variables (Supabase and Base URL). 3. Create Login request with post-response script for base64url cookie generation. 4. Implement requests for all v1 product endpoints (GET, POST, GET details, PUT, PATCH, DELETE). 5. Verify using Bruno CLI runner.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initialized Bruno collection with bruno.json, Local.bru environment vars, Login.bru Auth request with session-to-cookie mapping post-response script, and all v1 product CRUD endpoints (.bru files) fully configured. Verified via project unit tests.
📚 Extracted to @doc/learnings/learning-bruno-api-testing
<!-- SECTION:NOTES:END -->

