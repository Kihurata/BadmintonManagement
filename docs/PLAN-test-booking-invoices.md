# PLAN: Booking & Invoices Test Architecture

## 1. Overview
This plan establishes a comprehensive test automation architecture for the project's core revenue flows: `Bookings` and `Invoices`. It covers everything from granular UI unit tests to End-to-End (E2E) smoke tests and strict database policy (Row Level Security) validation.

## 2. Project Type
**WEB / BACKEND (Fullstack Next.js + Supabase)**

## 3. Success Criteria
*   **Confidence:** We can deploy new features knowing bookings cannot overlap and invoices cannot calculate incorrectly.
*   **Coverage:** 90%+ code coverage on the critical paths for `Bookings` and `Invoices`.
*   **Database Security:** RLS policies are mathematically proven to isolate Tenant/User data.
*   **E2E Reality:** Playwright successfully completes an End-of-Day macro flow against a local Supabase instance.

## 4. Tech Stack & Environments
*   **Unit / Integration:** Jest + React Testing Library (Fast, memory-only, mocked API).
*   **End-to-End (Local & CI):** Playwright hitting `http://localhost:3000` via `supabase start` (Local Docker DB).
*   **Smoke Testing (Staging):** Playwright hitting the Vercel Staging URL to verify Production Role configurations.
*   **Database Testing:** `pgTAP` or simple Jest API handlers to test RLS and Schema directly.

## 5. File Structure
```
tests/
├── e2e/                           # Playwright E2E tests
│   ├── setup/
│   │   └── auth.setup.ts          # Handles local test login states
│   ├── bookings.spec.ts           # E2E Booking flows
│   └── invoices-eod.spec.ts       # E2E End-of-Day invoice flows
├── integration/                   # Jest Integration Tests (API + UI boundary)
│   ├── edge-cases.test.ts         # Overlapping bookings, POS stockouts
├── db/                            # Supabase Schema / RLS Tests
│   └── rls-isolation.test.ts      # Tests enforcing User A cannot see User B
```

## 6. Task Breakdown

### Phase 1: Deepening Unit & Edge Case Coverage
*   **Task 1.1:** Add Edge Case tests to `bookings.test.tsx` (Booking overlaps, missing Court fees).
*   **Task 1.2:** Add Edge Case tests to `invoices.test.tsx` (Network failure during `auto-generate`, partial payments).
    *   **Agent:** `test-engineer`
    *   **Skills:** `testing-patterns`
    *   *INPUT:* Existing test files → *OUTPUT:* Updated files with 90%+ coverage → *VERIFY:* `npm test -- --coverage`

### Phase 2: Database (RLS & Schema) Layer Testing
*   **Task 2.1:** Create a script/test suite `rls-isolation.test.ts` to log in as two separate users (User A and User B) locally.
*   **Task 2.2:** Verify User A attempting to query User B's `bookings` or `invoices` returns `0` rows or a `403` error.
*   **Task 2.3:** Verify Database Schema (e.g., `court_fee` cannot be negative, `status` must be valid enum).
    *   **Agent:** `database-architect` & `security-auditor`
    *   **Skills:** `database-design`, `testing-patterns`
    *   *INPUT:* Local Supabase instance → *OUTPUT:* RLS testing suite → *VERIFY:* Tests pass proving strict isolation.

### Phase 3: Playwright Local E2E Setup
*   **Task 3.1:** Initialize Playwright (`npm init playwright@latest`) inside the repo.
*   **Task 3.2:** Configure `playwright.config.ts` to spin up the local `npm run dev` and expect `supabase start` to be running.
*   **Task 3.3:** Implement `bookings.spec.ts` (Login -> Select Date -> Pick Court -> Create Booking).
*   **Task 3.4:** Implement `invoices-eod.spec.ts` (Login -> Invoices -> Click 'Kết thúc ngày' -> Verify generated payload).
    *   **Agent:** `qa-automation-engineer`
    *   **Skills:** `webapp-testing`
    *   *INPUT:* Working local app → *OUTPUT:* Playwright config and 2 core specs → *VERIFY:* `npx playwright test` passes locally.

### Phase 4: Staging Smoke Tests (Role Verification)
*   **Task 4.1:** Create a specific Playwright project flag (`--project=staging`) that points to the Vercel Staging URL.
*   **Task 4.2:** Write a quick Smoke Test ensuring that an unauthenticated user is redirected, and an 'Admin' role can view the Invoices dashboard.
    *   **Agent:** `qa-automation-engineer`
    *   **Skills:** `deployment-procedures`
    *   *INPUT:* Staging URL → *OUTPUT:* Smoke test GitHub Action or script → *VERIFY:* Run command securely against staging.

## 7. Phase X: Verification
- [ ] Lint: Check `npm run lint`
- [ ] Security: Ensure no local test credentials leak into production.
- [ ] Local Test: `npm test` (Jest) passes.
- [ ] Database Test: `RLS` isolation asserts pass.
- [ ] E2E Test: `npx playwright test` executes the complete EOD flow cleanly.
