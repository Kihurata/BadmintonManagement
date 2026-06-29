---
id: oanevi
title: Use Staging Supabase for Dev and Bruno Testing
status: done
priority: high
labels: []
createdAt: '2026-06-27T20:20:49.038Z'
updatedAt: '2026-06-27T20:23:40.443Z'
timeSpent: 159
assignee: '@me'
---
# Use Staging Supabase for Dev and Bruno Testing

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure local development and Bruno collection to use staging Supabase database, stop local Supabase docker, and make Bruno cookie names environment-dynamic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Stop local Supabase container. 2. Configure .env.local with staging credentials. 3. Update environments/Local.bru in Bruno. 4. Refactor Bruno product requests to use dynamic supabaseCookieName variables. 5. Run tests using Bruno CLI.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Stopped local Supabase docker, copied staging credentials to .env.local, updated bruno/environments/Local.bru with staging URL/keys and dynamic supabaseCookieName variable. Updated all product .bru files to use dynamic cookie headers.
<!-- SECTION:NOTES:END -->

