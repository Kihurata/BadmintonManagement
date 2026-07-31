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
    if (await tabButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabButton.click();
    }
  }

  async verifyLatestTransaction(customerName: string, expectedStatus: string = 'Đã thanh toán') {
    // 1. Locate the specific invoice card containing the customer's name
    const invoiceCard = this.page.locator('div.rounded-xl').filter({ hasText: customerName }).first();
    await expect(invoiceCard).toBeVisible({ timeout: 10000 });

    // 2. Verify that the status badge inside this card displays "Đã thanh toán"
    const statusBadge = invoiceCard.locator('span', { hasText: new RegExp(expectedStatus, 'i') });
    await expect(statusBadge).toBeVisible({ timeout: 5000 });
  }
}
