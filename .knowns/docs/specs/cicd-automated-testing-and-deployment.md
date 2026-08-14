---
title: CI/CD Automated Testing and Deployment Pipeline
description: Specification for CI/CD automated testing (Unit, Integration, Regression) and automated deployment (Staging & Production)
createdAt: '2026-08-13T08:02:04.940Z'
updatedAt: '2026-08-13T08:02:04.940Z'
tags:
  - spec
  - approved
  - cicd
  - testing
  - deployment
---

# CI/CD Automated Testing & Deployment Pipeline

## Overview

This specification defines a comprehensive CI/CD pipeline for the Badminton Management System using GitHub Actions, Vercel, and Supabase CLI. The pipeline introduces a strict Quality Gate for all Pull Requests (enforcing Linting, Type Checking, Build Verification, Jest Unit Tests, Bruno API Regression, and Playwright E2E Tests against an ephemeral local Supabase Docker container), as well as automated deployment workflows for Staging and Production environments.

## Locked Decisions

- **D1**: Frontend application will be deployed to **Vercel** with automatic preview deployments for Pull Requests and production releases for `main`.
- **D2**: CI testing jobs will spin up an **ephemeral local Supabase Docker container** (`npx supabase start` / `db reset`) inside the GitHub Actions runner to execute unit, Bruno API regression, and Playwright E2E tests in complete data isolation.
- **D3**: **Multi-Branch Pipeline Strategy (`staging` & `main`)**:
  - Pull Requests to `staging` or `main`: Execute full CI Quality Gate (Lint, Type Check, Build Verification, Jest Unit, Bruno API Regression, Playwright E2E).
  - Merges/Pushes to `staging`: Push database migrations to Staging DB (`aokiueywjcbgmfswyttb`) and deploy Vercel Staging environment.
  - Merges/Pushes to `main`: Push database migrations to Production DB (`vubnycmmwwlpatinzzia`) and deploy Vercel Production environment.

## Requirements

### Functional Requirements

- **FR-1**: GitHub Actions Quality Gate workflow (`ci-quality-gate.yml`) executing static analysis (ESLint), TypeScript strict compilation (`tsc --noEmit`), and Next.js production build (`next build`).
- **FR-2**: Automated Unit & Repository testing job executing `npm test` (Jest) with code coverage report uploads.
- **FR-3**: Ephemeral local Supabase Docker environment initialized in CI (`supabase start`, `supabase db reset`) with seeded test data (`supabase/seed.sql`).
- **FR-4**: Automated Bruno API Regression job executing `npx @usebruno/cli run bruno/ --env Local` against the local Supabase container.
- **FR-5**: Automated Playwright E2E testing job running `npx playwright test` against local Next.js dev/build server backed by the local Supabase container, uploading HTML test reports as artifacts on failure or completion.
- **FR-6**: Automated Staging Deployment workflow (`deploy-staging.yml`) applying database migrations (`supabase db push`) to Staging DB (`aokiueywjcbgmfswyttb`) and triggering Vercel Staging deployment on `staging` push.
- **FR-7**: Automated Production Deployment workflow (`deploy-production.yml`) applying database migrations (`supabase db push`) to Production DB (`vubnycmmwwlpatinzzia`) and triggering Vercel Production deployment on `main` push.

### Non-Functional Requirements

- **NFR-1**: **Production Database Safety** – Automated test suites in CI must NEVER connect to or modify Production DB (`vubnycmmwwlpatinzzia`). All tests run against the local ephemeral Supabase Docker container.
- **NFR-2**: **Performance & Caching** – GitHub Actions steps must use Node/npm caching (`actions/setup-node@v4` with `cache: 'npm'`) and Playwright browser caching to keep CI execution time under 10 minutes.
- **NFR-3**: **Secret Security** – All sensitive tokens (`SUPABASE_ACCESS_TOKEN`, `PROD_DB_PASSWORD`, `PROD_PROJECT_ID`, `STAGING_PROJECT_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, auth credentials) must be managed strictly via GitHub Secrets.

## Acceptance Criteria

- [ ] **AC-1**: `ci-quality-gate.yml` workflow triggers automatically on PRs targeting `staging` or `main`.
- [ ] **AC-2**: `ci-quality-gate.yml` fails and blocks PR merge if ESLint, `tsc --noEmit`, or `npm run build` fails.
- [ ] **AC-3**: Jest unit tests run in CI and pass cleanly.
- [ ] **AC-4**: Local Supabase Docker starts in CI, seeds initial data, and executes Bruno API regression suite successfully.
- [ ] **AC-5**: Playwright E2E tests run against the local web server and local Supabase instance in CI, uploading reports as GitHub artifacts.
- [ ] **AC-6**: Merging/Pushing code to `staging` automatically pushes database migrations to Staging Supabase and deploys Vercel Staging environment.
- [ ] **AC-7**: Merging/Pushing code to `main` automatically pushes database migrations to Production Supabase and deploys Vercel Production environment.

## Scenarios

### Scenario 1: Developer opens a Pull Request to `staging`
**Given** a developer creates a PR from a feature branch to `staging`  
**When** GitHub Actions triggers `ci-quality-gate.yml`  
**Then** linting, type-checking, `npm run build`, Jest unit tests, Bruno API regression tests, and Playwright E2E tests execute in parallel/sequential jobs using an ephemeral local Supabase Docker container, reporting pass/fail status directly on the PR.

### Scenario 2: Code is merged into `staging`
**Given** a PR passes all Quality Gate checks and is merged to `staging`  
**When** GitHub Actions triggers `deploy-staging.yml`  
**Then** Supabase CLI links to Staging DB (`aokiueywjcbgmfswyttb`) and pushes new migrations, followed by Vercel CLI deploying the latest code to the Staging preview URL.

### Scenario 3: Code is released to `main`
**Given** tested changes on `staging` are merged into `main`  
**When** GitHub Actions triggers `deploy-production.yml`  
**Then** Supabase CLI links to Production DB (`vubnycmmwwlpatinzzia`) and pushes new migrations, followed by Vercel CLI releasing the production deployment to live users.

## Technical Notes

- GitHub Actions Workflows to create/modify under `.github/workflows/`:
  - `.github/workflows/ci-quality-gate.yml`
  - `.github/workflows/deploy-staging.yml`
  - `.github/workflows/deploy-production.yml`
- Supabase Docker CLI initialization in GitHub Actions runner:
  - Requires `supabase/setup-cli@v1` and starting Docker service (`npx supabase start`).
- Vercel Deployment Action integration:
  - Uses `amondnet/vercel-action@v25` or `vercel` CLI with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

## Open Questions

- None. All gray areas (hosting target, DB isolation strategy, workflow triggers) have been resolved and locked.
