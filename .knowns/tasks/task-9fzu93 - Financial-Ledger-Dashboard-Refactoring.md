---
id: 9fzu93
title: 'Financial Ledger & Dashboard Refactoring'
status: done
priority: high
labels: []
createdAt: '2026-07-30T09:00:20.562Z'
updatedAt: '2026-07-30T10:36:24.785Z'
timeSpent: 0
assignee: '@me'
---
# Financial Ledger & Dashboard Refactoring

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement transactions general ledger, tenant balances, invoice status enum, triggers, app logic refactoring, and migration safety patches
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Patch SQL migration files with uq_transactions_reference index, zero-amount COALESCE fix, and tenant balance auto-upsert
- [x] #2 Local Supabase migration verification and idempotency check
- [x] #3 Refactor ExpenseForm and API endpoints to insert directly into transactions
- [x] #4 Refactor Dashboard API to query tenant_balances and apply unstable_cache
- [x] #5 Pass static compilation (npx tsc) and unit tests
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Patch migration SQL code (20260729000000, 20260729000001, 20260729000002) with unique reference index, zero-amount guard, and tenant auto-upsert. 2. Verification on local Supabase: Seed mock database on OLD schema first (pre-20260729 migration state with legacy invoices, expenses, restocks), then run migration UP to verify backfill script and trigger calculations, then re-run to confirm idempotency. 3. Refactor application code: ExpenseForm, invoice payments, Dashboard API with tenant_balances and unstable_cache. 4. Run verification (npx tsc, npm test) and update Second Brain docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Phase 1 complete: Patched 20260729000000, 20260729000001, 20260729000002 with uq_transactions_reference index, COALESCE fix, and auto-upsert for tenant balances.
Phase 2 complete: Applied migration patches to staging DB (aokiueywjcbgmfswyttb), verified backfill of invoices, expenses, and restocks into transactions & tenant_balances, and verified 100% backfill idempotency.
Phase 3 complete: Verified direct write of expenses into transactions, verified payInvoice ledger insertion, and integrated Next.js unstable_cache & revalidateTag for dashboard cache invalidation.
All 5 ACs met. Validated locally with Docker Supabase, backfilled legacy July records, updated cache invalidation with revalidateTag, verified TypeScript build (tsc) and 100% passing Jest test suite (41/41 tests passing across 6 test suites).
<!-- SECTION:NOTES:END -->

