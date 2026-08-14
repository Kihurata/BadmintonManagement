---
id: lbl61l
title: Automated Staging Deployment Workflow
status: done
priority: medium
labels:
  - from-spec
  - cicd
  - deployment
createdAt: '2026-08-13T08:04:58.607Z'
updatedAt: '2026-08-13T08:07:21.080Z'
timeSpent: 0
assignee: '@me'
spec: specs/cicd-automated-testing-and-deployment
fulfills:
  - AC-6
---
# Automated Staging Deployment Workflow

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create .github/workflows/deploy-staging.yml triggered on push to staging. Push database migrations (supabase db push) to Staging DB (aokiueywjcbgmfswyttb) and deploy Next.js application to Vercel Staging preview environment using Vercel CLI/Action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 deploy-staging.yml workflow triggers on push to staging
- [x] #2 Supabase CLI pushes migrations to Staging DB
- [x] #3 Vercel CLI/Action deploys staging preview build to Vercel
<!-- AC:END -->

