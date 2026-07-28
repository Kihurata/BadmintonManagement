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
    // Assert submit button is visible
    const submitBtn = this.page.getByRole('button', { name: /^Đặt sân$/i }).or(this.page.locator('button:has-text("Đặt sân")'));
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Select court if specified
    if (options.courtName) {
      const courtTrigger = this.page.locator('div:has(label:has-text("Chọn sân")) button').or(this.page.locator('button:has-text("Sân")')).first();
      if (await courtTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await courtTrigger.click();
        const courtOption = this.page.getByRole('option', { name: new RegExp(options.courtName, 'i') }).first();
        if (await courtOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await courtOption.click();
        } else {
          await this.page.keyboard.press('Escape');
        }
      }
    }

    // Select customer if specified
    if (options.customerName) {
      const customerTrigger = this.page.getByRole('combobox', { name: /Khách hàng/i }).or(this.page.locator('button:has-text("Chọn khách hàng")'));
      if (await customerTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await customerTrigger.click();
        const searchInput = this.page.getByPlaceholder('Tìm tên hoặc SĐT...');
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput.fill(options.customerName);
        }
        const option = this.page.getByRole('option', { name: new RegExp(options.customerName, 'i') }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
    }

    // Fill start time (Generate random hour between 07:00 and 22:00)
    const timeInput = this.page.locator('input#startTime').or(this.page.locator('input[type="time"]'));
    if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const timeToSet = options.startTime || '18:00';
      await timeInput.fill(timeToSet);
      await timeInput.dispatchEvent('change');
    }

    // Select duration if specified
    if (options.durationHours) {
      const durationSelect = this.page.locator('select[name="duration"]').or(this.page.locator('button:has-text("giờ")'));
      if (await durationSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await durationSelect.click();
        const durationOption = this.page.getByRole('option', { name: `${options.durationHours} giờ` });
        if (await durationOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await durationOption.click();
        }
      }
    }

    // Submit booking form
    await submitBtn.click();
  }

  async expectBookingCreated() {
    const submitBtn = this.page.getByRole('button', { name: /^Đặt sân$/i }).or(this.page.locator('button:has-text("Đặt sân")'));
    const errorBanner = this.page.locator('div.bg-red-50').first();

    // Wait until either the modal closes (submitBtn hidden) OR an error banner appears
    await Promise.race([
      expect(submitBtn).toBeHidden({ timeout: 10000 }),
      expect(errorBanner).toBeVisible({ timeout: 10000 }),
    ]).catch(() => { });

    if (await errorBanner.isVisible().catch(() => false)) {
      const errorText = await errorBanner.innerText();
      throw new Error(`Booking creation failed with server error: "${errorText}"`);
    }

    await expect(submitBtn).toBeHidden({ timeout: 5000 });
  }
}
