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
    // On check-in success, onCheckInSuccess() closes the dialog automatically
    await expect(checkInBtn).toBeHidden({ timeout: 10000 });
  }

  async addPosItem(itemName: string) {
    // Locate product card or selector list
    const productItem = this.page.locator(`text=${itemName}`).first();
    if (await productItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      const addButton = this.page.locator(`div:has-text("${itemName}") button:has-text("+")`).first()
        .or(this.page.locator('button:has-text("+")').first());
      if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addButton.click();
      }
    }
  }

  async openCheckoutForm() {
    const checkoutBtn = this.page.getByRole('button', { name: /Thanh toán & Trả sân/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    await checkoutBtn.click();
  }

  async selectPaymentMethod(method: 'BANK_TRANSFER' | 'CASH') {
    const methodText = method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt';
    // PaymentSelector uses a <label> container
    const methodLabel = this.page.locator('label').filter({ hasText: methodText }).first()
      .or(this.page.getByText(methodText)).first();
    await expect(methodLabel).toBeVisible({ timeout: 10000 });
    await methodLabel.click();
  }

  async confirmPayment() {
    // Bottom button in CheckoutForm: <button ...>Thanh toán</button>
    const confirmBtn = this.page.locator('div[class*="shrink-0"] button:has-text("Thanh toán")')
      .or(this.page.getByRole('button', { name: /^Thanh toán$/i })).first();
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click();
  }

  async expectPaymentComplete() {
    // Verify checkout modal closes completely after payment confirmation
    const confirmBtn = this.page.locator('div[class*="shrink-0"] button:has-text("Thanh toán")').first();
    await expect(confirmBtn).toBeHidden({ timeout: 10000 });
  }
}
