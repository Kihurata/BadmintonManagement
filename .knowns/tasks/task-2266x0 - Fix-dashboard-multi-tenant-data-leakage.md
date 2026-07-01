---
id: 2266x0
title: Fix dashboard multi-tenant data leakage
status: done
priority: medium
labels: []
createdAt: '2026-06-29T03:54:47.975Z'
updatedAt: '2026-06-29T04:30:01.092Z'
timeSpent: 53
assignee: '@me'
---
# Fix dashboard multi-tenant data leakage

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add tenant_id and RLS to inventory_logs and recurring_rules to fix cross-tenant data leakage on the dashboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a new migration file to fix missing multi-tenant coverage.
2. Add `tenant_id` column to `inventory_logs` and `recurring_rules` allowing NULL.
3. Backfill existing records with the default tenant (`00000000-0000-0000-0000-000000000000`).
4. Alter `tenant_id` column to be `NOT NULL`.
5. Add `trigger_auto_set_tenant_id` trigger to both tables.
6. Enable RLS and create standard `tenant_id` policies for both tables.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reopened: implementing task.
Done: Applied migration to add tenant_id to inventory_logs and recurring_rules.
<!-- SECTION:NOTES:END -->

