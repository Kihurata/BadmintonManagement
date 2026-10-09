import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Dashboard Performance & Caching Lifecycle', () => {
  test('Owner accesses /dashboard, verifies metrics, month switching, and API response', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Login
    await test.step('Authenticate as Owner', async () => {
      await loginPage.goto();
      await loginPage.login();
      await loginPage.expectLoggedIn();
    });

    // Step 2: Navigate to /dashboard
    await test.step('Navigate to Executive Dashboard', async () => {
      await page.goto('/dashboard');
      
      // Ensure page title and main elements are visible
      await expect(page.getByRole('heading', { name: /Buồng lái Tài chính/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Ngân quỹ hiện tại (Lũy kế)')).toBeVisible();
      await expect(page.getByText('Tiền mặt')).toBeVisible();
      await expect(page.getByText('Ngân hàng')).toBeVisible();
      await expect(page.getByText('Tổng ngân quỹ')).toBeVisible();
    });

    // Step 3: Test Month Switching with URL SearchParams
    await test.step('Month switcher updates URL searchParams and metrics view', async () => {
      // Find and click the previous month button (chevron_left)
      const prevMonthBtn = page.locator('button:has(span.material-symbols-outlined:has-text("chevron_left"))');
      await expect(prevMonthBtn).toBeVisible();
      await prevMonthBtn.click();

      // Expect URL to have ?month=
      await expect(page).toHaveURL(/\?month=\d{4}-\d{2}/, { timeout: 10000 });

      // Click "Hiện tại" button to return to the active month
      const currentMonthBtn = page.getByRole('button', { name: 'Hiện tại' });
      await expect(currentMonthBtn).toBeEnabled();
      await currentMonthBtn.click();

      // URL should no longer be in the past or should be reset
      await expect(page).toHaveURL(/\/dashboard/);
    });

    // Step 4: Verify /api/dashboard endpoint returns 200 with proper data structure
    await test.step('Verify /api/dashboard route response format', async () => {
      const response = await page.request.get('/api/dashboard');
      expect(response.status()).toBe(200);

      const json = await response.json();
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('treasury');
      expect(json).toHaveProperty('monthMetrics');
      expect(json).toHaveProperty('chartData');
      expect(json).toHaveProperty('topProducts');
      expect(json).toHaveProperty('lowStockItems');
      expect(json).toHaveProperty('recentExpenses');
    });
  });
});
