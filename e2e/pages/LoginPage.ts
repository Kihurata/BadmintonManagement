import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: /Đăng nhập/i })).toBeVisible();
  }

  async login(
    email: string = process.env.E2E_TEST_USER_EMAIL || '',
    password: string = process.env.E2E_TEST_USER_PASSWORD || ''
  ) {
    if (!email || !password) {
      throw new Error('E2E credentials missing. Please set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in environment variables.');
    }
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.getByRole('button', { name: 'Đăng nhập' }).click();
  }

  async expectLoggedIn() {
    // Check if error message is displayed on failure
    const errorBanner = this.page.locator('.text-red-700');
    if (await errorBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      const msg = await errorBanner.innerText();
      throw new Error(`Login failed with message: "${msg}". Please check your credentials in .env.local.`);
    }

    // Expect URL to navigate away from /login (e.g. to / or /schedule)
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 10000 });
  }
}
