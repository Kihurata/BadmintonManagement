import { Page, expect } from '@playwright/test';

export class CheckoutModal {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async checkIn() {
    const checkInBtn = this.page.getByRole('button', { name: /Check In/i });
    await expect(checkInBtn).toBeVisible({ timeout: 10000 });
    await checkInBtn.click();
    // Wait for state to change to CHECKED_IN
    await expect(this.page.locator('text=CHECKED_IN').first()).toBeVisible({ timeout: 10000 });
  }

  async addPosItem(itemName: string) {
    // Locate product card or selector list
    const productItem = this.page.locator(`text=${itemName}`).first();
    await expect(productItem).toBeVisible();

    // Click (+) button to add item
    const addButton = this.page.locator(`div:has-text("${itemName}") button:has-text("+")`).first()
      .or(this.page.locator('button:has-text("+")').first());
    await addButton.click();
  }

  async openCheckoutForm() {
    const checkoutBtn = this.page.getByRole('button', { name: /Thanh toán & Trả sân/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    await checkoutBtn.click();
  }

  async selectPaymentMethod(method: 'BANK_TRANSFER' | 'CASH') {
    const methodText = method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt';
    const methodButton = this.page.locator(`button:has-text("${methodText}")`).first();
    if (await methodButton.isVisible()) {
      await methodButton.click();
    }
  }

  async confirmPayment() {
    const confirmBtn = this.page.getByRole('button', { name: /Xác nhận|Thanh toán/i }).last();
    await confirmBtn.click();
  }

  async expectPaymentComplete() {
    // Verify modal is closed or redirected
    await expect(this.page.getByRole('button', { name: /Check In/i })).toBeHidden({ timeout: 10000 });
  }
}
