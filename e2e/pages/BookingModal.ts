import { Page, expect } from '@playwright/test';

export interface CreateBookingOptions {
  courtName?: string;
  customerName?: string;
  startTime?: string;
  durationHours?: string;
}

export class BookingModal {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async createBooking(options: CreateBookingOptions = {}) {
    // Assert modal is visible
    await expect(this.page.getByRole('button', { name: /Tạo đặt sân/i })).toBeVisible();

    // Select court if specified
    if (options.courtName) {
      const courtSelect = this.page.locator('button:has-text("Sân")').first();
      if (await courtSelect.isVisible()) {
        await courtSelect.click();
        await this.page.getByRole('option', { name: options.courtName }).click();
      }
    }

    // Select customer if specified
    if (options.customerName) {
      const customerTrigger = this.page.getByRole('combobox', { name: /Khách hàng/i }).or(this.page.locator('button:has-text("Chọn khách hàng")'));
      if (await customerTrigger.isVisible()) {
        await customerTrigger.click();
        const searchInput = this.page.getByPlaceholder('Tìm tên hoặc SĐT...');
        if (await searchInput.isVisible()) {
          await searchInput.fill(options.customerName);
        }
        await this.page.getByRole('option', { name: new RegExp(options.customerName, 'i') }).first().click();
      }
    }

    // Fill start time if specified
    if (options.startTime) {
      const timeInput = this.page.locator('input[type="time"]');
      if (await timeInput.isVisible()) {
        await timeInput.fill(options.startTime);
      }
    }

    // Select duration if specified
    if (options.durationHours) {
      const durationSelect = this.page.locator('select[name="duration"]').or(this.page.locator('button:has-text("giờ")'));
      if (await durationSelect.isVisible()) {
        await durationSelect.click();
        await this.page.getByRole('option', { name: `${options.durationHours} giờ` }).click();
      }
    }

    // Submit booking form
    const submitBtn = this.page.getByRole('button', { name: /Tạo đặt sân/i });
    await submitBtn.click();
  }

  async expectBookingCreated() {
    // Modal should close automatically after creation
    await expect(this.page.getByRole('button', { name: /Tạo đặt sân/i })).toBeHidden({ timeout: 10000 });
  }
}
