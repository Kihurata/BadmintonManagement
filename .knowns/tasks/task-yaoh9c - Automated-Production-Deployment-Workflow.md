---
id: yaoh9c
title: Automated Production Deployment Workflow
status: done
priority: medium
labels:
  - from-spec
  - cicd
  - deployment
createdAt: '2026-08-13T08:05:00.350Z'
updatedAt: '2026-08-13T08:07:31.067Z'
timeSpent: 0
assignee: '@me'
spec: specs/cicd-automated-testing-and-deployment
fulfills:
  - AC-7
---
# Automated Production Deployment Workflow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create/update .github/workflows/deploy-production.yml triggered on push to main. Apply Supabase DB migrations (supabase db push) to Production DB (vubnycmmwwlpatinzzia) and release production deployment to Vercel Production environment using Vercel CLI/Action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 deploy-production.yml workflow triggers on push to main
- [x] #2 Supabase CLI pushes migrations to Production DB (vubnycmmwwlpatinzzia)
- [x] #3 Vercel CLI/Action deploys production build to Vercel
<!-- AC:END -->

