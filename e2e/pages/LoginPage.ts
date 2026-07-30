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
    // Assert redirect away from /login to dashboard or /schedule
    await expect(this.page).not.toHaveURL(/\/login/);
  }
}
