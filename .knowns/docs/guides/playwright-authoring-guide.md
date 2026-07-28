---
title: How to Write Playwright E2E Tests on Your Own (Developer Guide)
tags:
  - testing
  - e2e
  - playwright
  - tutorial
  - best-practices
---

# How to Write Playwright E2E Tests on Your Own (Developer Guide)

A step-by-step tutorial designed to teach developers how to construct, debug, and maintain custom Playwright E2E tests for Next.js applications independently.

---

## 🎯 1. The Core Formula: Locate ➔ Act ➔ Assert

Every Playwright test step follows a simple 3-part formula:

$$\text{Locate Element} \longrightarrow \text{Perform Action} \longrightarrow \text{Assert Result}$$

```typescript
test('My custom scenario', async ({ page }) => {
  // 1. Locate & Act
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  // 2. Assert Result
  await expect(page).toHaveURL('/schedule');
});
```

---

## 🔍 Step 1: How to Pick Locators

Playwright encourages finding elements the way real users do—by text, ARIA roles, or visible labels—rather than fragile CSS classes.

### Priority Ranking for Locators

| Priority | Method | Example Code | Best For |
| :--- | :--- | :--- | :--- |
| **1 (Best)** | `getByRole()` | `page.getByRole('button', { name: 'Thanh toán' })` | Buttons, headings, dialogs, checkboxes, options |
| **2** | `getByLabel()` | `page.getByLabel('Email')` | Form inputs with associated `<label>` |
| **3** | `getByPlaceholder()` | `page.getByPlaceholder('Tìm tên...')` | Search inputs |
| **4** | `getByText()` | `page.getByText('Lịch đặt sân')` | Static text elements, titles, status badges |
| **5** | `locator().filter()` | `page.locator('div.card').filter({ hasText: 'Khách A' })` | Scoping within a specific card/row container |

### 💡 Pro Tip: Use UI Mode Locator Picker
Instead of guessing locators:
1. Run `npm run test:e2e:ui`.
2. Click the **Pick Locator** icon at the top of the browser window.
3. Click any element on your app screen to automatically copy the exact Playwright locator!

---

## ⚡ Step 2: Performing Actions (User Interactions)

### Common Actions

```typescript
// Click an element
await page.getByRole('button', { name: 'Thanh toán' }).click();

// Fill text input
await page.locator('#email').fill('admin@example.com');

// React Controlled Inputs (HTML5 time/date inputs)
const timeInput = page.locator('input#startTime');
await timeInput.fill('10:00');
await timeInput.dispatchEvent('change'); // Triggers React's onChange state handler

// Radix / Shadcn Combobox & Dropdown Selection
await page.getByRole('combobox', { name: /Khách hàng/i }).click();
await page.getByPlaceholder('Tìm tên...').fill('Khách 1');
await page.getByRole('option', { name: /Khách 1/i }).click();

// Auto-scroll timeline slots into view before clicking
const bookingCard = page.locator('div.card').last();
await bookingCard.scrollIntoViewIfNeeded();
await bookingCard.click();
```

---

## 🛡️ Step 3: Assertions (Verifying Outcomes)

Playwright uses **Web-First Assertions**. They automatically retry until the condition is met (up to 5–10 seconds), preventing flakiness.

```typescript
// Verify an element is visible
await expect(page.getByText('Đang sử dụng')).toBeVisible();

// Verify a modal or button has closed/hidden
await expect(submitButton).toBeHidden();

// Verify text inside a specific container
const statusBadge = invoiceCard.locator('span', { hasText: 'Đã thanh toán' });
await expect(statusBadge).toBeVisible();

// Verify page URL
await expect(page).toHaveURL('/schedule');
```

---

## 🏛️ Step 4: Structuring a Page Object Model (POM) Class

Keep test files clean by separating **UI selection logic** (Page Object) from **Test Scenarios** (Spec file).

### 1. Create Page Object File (`e2e/pages/MyFeaturePage.ts`)
```typescript
import { Page, expect } from '@playwright/test';

export class MyFeaturePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/my-feature');
  }

  async doSomething(name: string) {
    const input = this.page.getByPlaceholder('Nhập tên');
    await input.fill(name);
    await this.page.getByRole('button', { name: 'Lưu' }).click();
  }

  async verifySuccess() {
    await expect(this.page.getByText('Thành công')).toBeVisible();
  }
}
```

### 2. Create Spec File (`e2e/specs/my-feature.spec.ts`)
```typescript
import { test } from '@playwright/test';
import { MyFeaturePage } from '../pages/MyFeaturePage';

test.describe('My Feature Workflow', () => {
  test('User can complete my feature flow', async ({ page }) => {
    const myFeature = new MyFeaturePage(page);

    await myFeature.goto();
    await myFeature.doSomething('Test Data');
    await myFeature.verifySuccess();
  });
});
```

---

## 🚨 5. Developer Checklist for Troubleshooting

When writing a new test, ask yourself:

1. **Did I check for hidden container scoping?**
   - *Issue*: `strict mode violation: locator(...) resolved to 5 elements`.
   - *Fix*: Scope locator using `.filter({ hasText: '...' })` or `.first()`.
2. **Did React state update after filling inputs?**
   - *Issue*: Form validation fails even after calling `.fill()`.
   - *Fix*: Call `await input.dispatchEvent('change')`.
3. **Is the element visible on screen without scrolling?**
   - *Issue*: Click times out on long schedule pages.
   - *Fix*: Call `await element.scrollIntoViewIfNeeded()`.
4. **Is the test running on today's local date?**
   - *Issue*: Booking disappears from timeline.
   - *Fix*: Use safe daytime hours (`10:00` or `14:00`) that stay on today's date in local time and UTC.
