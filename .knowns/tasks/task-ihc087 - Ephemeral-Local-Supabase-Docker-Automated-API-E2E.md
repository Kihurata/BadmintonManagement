---
id: ihc087
title: 'Ephemeral Local Supabase Docker & Automated API/E2E Test Jobs'
status: done
priority: high
labels:
  - from-spec
  - cicd
  - testing
createdAt: '2026-08-13T08:04:56.815Z'
updatedAt: '2026-08-13T08:07:13.079Z'
timeSpent: 0
assignee: '@me'
spec: specs/cicd-automated-testing-and-deployment
fulfills:
  - AC-4
  - AC-5
---
# Ephemeral Local Supabase Docker & Automated API/E2E Test Jobs

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend .github/workflows/ci-quality-gate.yml with jobs that initialize an ephemeral local Supabase Docker environment (npx supabase start), apply seed data, run Bruno API regression collection, and run Playwright E2E tests with artifact uploads.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ephemeral local Supabase Docker container starts and seeds in CI runner
- [x] #2 npx @usebruno/cli runs Bruno API suite against local container
- [x] #3 Playwright E2E tests run against local web server & DB and upload HTML reports on failure/completion
<!-- AC:END -->

