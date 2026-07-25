---
title: Efficient Playwright E2E Testing Guide
tags:
  - testing
  - e2e
  - playwright
  - nextjs
  - best-practices
---

# Efficient Playwright E2E Testing Guide

A comprehensive guide for developers and QA engineers on writing fast, resilient, and maintainable end-to-end (E2E) browser tests using Playwright.

---

## 🎯 1. Core Philosophy: The Playwright Way

1. **User-Centric Locators**: Query elements the way a real user finds them (by text, label, placeholder, or ARIA role), rather than relying on fragile CSS selectors (`.btn-primary-2`).
2. **Auto-Waiting over Arbitrary Sleeps**: Playwright automatically waits for elements to be visible, enabled, and stable before acting. **Never use `page.waitForTimeout(5000)`**—it slows down tests and causes flakiness.
3. **Strict Isolation**: Each test runs in an isolated browser context (like an incognito window). Tests must not depend on side-effects left by previous tests.

---

## 🚀 2. Command Quick-Reference

| Command | Purpose | When to Use |
| :--- | :--- | :--- |
| `npm run test:e2e:ui` | Opens Playwright **Interactive UI Mode** | **Daily Development**: Pick locators, watch live execution, time-travel debug steps. |
| `npx playwright codegen http://localhost:3000` | Code Generator (Record & Playback) | Quickly record user interactions into clean Playwright code. |
| `npm run test:e2e` | Runs all E2E tests headlessly | CI/CD pipelines or pre-commit checks. |
| `npx playwright test --debug` | Runs tests in headed mode with Playwright Inspector | Step-by-step pause & DOM inspection during debugging. |
| `npm run test:e2e:report` | Opens generated HTML test report | Inspecting screenshots, video clips, and traces after a failure. |

---

## 💡 3. High-Efficiency Features You Should Use

### A. Interactive UI Mode (`npm run test:e2e:ui`)
Playwright's UI Mode is the single biggest productivity booster. It provides:
- **Time-Travel Debugging**: Hover over any test step to see exact DOM state before and after the action.
- **Watch Mode**: Automatically re-run tests on file save.
- **Locator Picker**: Click any element on your app's screen to automatically copy the optimal locator code (`page.getByRole(...)`).

### B. Code Generator (`codegen`)
Instead of manually typing locators for complex forms:
```bash
npx playwright codegen http://localhost:3000/login
```
Click through your application, fill forms, and copy the generated typescript straight into your Page Object Model files.

### C. Fast Authentication (Storage State)
Logging in via the UI before every single test wastes 3–5 seconds per spec.
- **Efficient Approach**: Perform login once in a setup step, save the authentication state to a file (`playwright/.auth/user.json`), and reuse it across all tests:
```typescript
// global.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('admin@horizonbadminton.com');
  await page.locator('#password').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

---

## 🏛️ 4. Page Object Model (POM) Best Practices

Separate **Test Intent** from **UI Selection Logic**.

- **Test Spec (`e2e/specs/booking-lifecycle.spec.ts`)**: Reads like a high-level user story.
- **Page Object (`e2e/pages/BookingModal.ts`)**: Encapsulates component-specific selectors and UI operations.

### Recommended Locators Ranking:
1. `page.getByRole('button', { name: 'Thanh toán' })` ✅ *(Best: Accessible & resilient to styling changes)*
2. `page.getByLabel('Email')` ✅ *(Great for form inputs)*
3. `page.getByPlaceholder('Tìm tên...')` ✅
4. `page.getByText('Khách vãng lai')` ✅
5. `page.locator('.btn-submit')` ❌ *(Avoid: Breaks when Tailwind/CSS classes are refactored)*

---

## ⚡ 5. Handling Radix UI / Shadcn Components

In Next.js apps using Radix UI (Dialogs, Comboboxes, Selects), elements are rendered dynamically in portals outside the standard DOM hierarchy.

### Dialog / Modal Handling:
```typescript
// Wait for modal title to be visible before interacting with inner form
await expect(page.getByRole('dialog')).toBeVisible();
```

### Combobox / Searchable Dropdown:
```typescript
// Open combobox, type in search, select option
await page.getByRole('combobox', { name: /Khách hàng/i }).click();
await page.getByPlaceholder('Tìm tên...').fill('Khách Test 1');
await page.getByRole('option', { name: /Khách Test 1/i }).click();
```

---

## 🛠️ 6. Debugging Flaky Tests & Trace Viewer

When a test fails in headless mode or on CI:
1. Playwright captures a `.zip` trace automatically (configured in `playwright.config.ts`).
2. Open the trace viewer:
   ```bash
   npx playwright show-trace test-results/.../trace.zip
   ```
3. Inspect network calls, console logs, and snapshot DOM tree at the precise millisecond of failure.

---

## 📂 7. Project Structure Reference

```
BadmintonManagement/
├── e2e/
│   ├── pages/                   # Page Object Models
│   │   ├── LoginPage.ts
│   │   ├── SchedulePage.ts
│   │   ├── BookingModal.ts
│   │   ├── CheckoutModal.ts
│   │   └── InvoiceHistoryPage.ts
│   └── specs/                   # Test specs
│       └── booking-lifecycle.spec.ts
└── playwright.config.ts         # Playwright setup & server launcher
```
