---
id: 2b1yf7
title: 'Tenant Settings & VietQR / Pricing Configuration'
status: in-progress
priority: high
labels: []
createdAt: '2026-08-08T10:17:54.945Z'
updatedAt: '2026-08-08T16:24:16.188Z'
timeSpent: 0
---
# Tenant Settings & VietQR / Pricing Configuration

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create tenant settings satellite table, API routes/actions, VietQR bank setup, custom court pricing defaults, and UI Settings page
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create public.tenant_settings satellite table migration (bank info, pricing defaults, evening_start_time) with RLS
2. Create tenant-settings repository and update VietQR/pricing utilities
3. Create Server Actions and /settings UI page for bank/pricing/evening_start_time config
4. Add Settings button to Sidebar for Manager/Owner roles
5. Test with dynamic VietQR QR generation, evening switch time calculation, and build verification
<!-- SECTION:PLAN:END -->

