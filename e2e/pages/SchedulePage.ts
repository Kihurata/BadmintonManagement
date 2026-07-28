import { Page, expect } from '@playwright/test';

export class SchedulePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/schedule');
    await expect(this.page.getByRole('heading', { name: /Lịch đặt sân/i })).toBeVisible();
  }

  async openNewBookingModal() {
    // Click the floating action button (+)
    const fabButton = this.page.locator('button:has(span.material-symbols-outlined:has-text("add"))').first();
    await fabButton.click();
  }

  async clickBookingSlot(customerName: string) {
    // Locate the newest booking card on the schedule timeline
    const bookingSlot = this.page.locator('div[class*="cursor-pointer"]').last();
    await expect(bookingSlot).toBeVisible({ timeout: 10000 });
    await bookingSlot.scrollIntoViewIfNeeded();
    await bookingSlot.click();
  }
}
