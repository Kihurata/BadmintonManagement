import { Page, expect } from '@playwright/test';

export class InvoiceHistoryPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/invoices');
  }

  async switchToTransactionHistoryTab() {
    const tabButton = this.page.locator('button:has-text("Lịch Sử Giao Dịch")').or(this.page.locator('button:has-text("Lịch sử")')).first();
    if (await tabButton.isVisible()) {
      await tabButton.click();
    }
  }

  async verifyLatestTransaction(customerName: string) {
    const transactionRow = this.page.locator(`text=${customerName}`).first();
    await expect(transactionRow).toBeVisible({ timeout: 10000 });
  }
}
