---
id: 4f4crx
title: Database Migration for Tenant Members and Invoice Split Schema
status: done
priority: high
labels: []
createdAt: '2026-09-08T07:49:14.026Z'
updatedAt: '2026-09-08T07:54:42.319Z'
completedAt: '2026-09-08T07:54:42.319Z'
timeSpent: 0
assignee: '@me'
spec: specs/simplified-bill-splitting
fulfills:
  - AC-1
---
# Database Migration for Tenant Members and Invoice Split Schema

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Apply migration 20260808000000_simplified_members_and_splitting.sql on local Supabase
- [x] #2 Verify table members created and foreign keys updated on invoice_split_attendance and invoice_items
- [x] #3 Verify invoice_split_summary view recreation
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Applied migration 20260808000000_simplified_members_and_splitting.sql to local Supabase. Verified members table schema, RLS policy, auto_set_tenant_id trigger, foreign keys from invoice_items and invoice_split_attendance, and recreated invoice_split_summary view.
<!-- SECTION:NOTES:END -->

