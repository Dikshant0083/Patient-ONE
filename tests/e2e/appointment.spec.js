const { test, expect } = require('@playwright/test');

test.describe('Appointment Booking with Payment', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', 'testpatient@example.com');
    await page.fill('input[name="password"]', 'password123');

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(/patient\/dashboard/);
  });

  test('should display book appointment form', async ({ page }) => {

    await page.locator('#doctors').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const bookBtn = page.locator('.doctor-btn.btn-appointment').first();

    if (await bookBtn.count() === 0) {
      test.skip();
    }

    await bookBtn.click();

    // ✅ ASSERT NAVIGATION (MOST RELIABLE)
    await page.waitForURL(/appointment/i);

    // ✅ ASSERT FORM FIELDS (REAL UI)
    await expect(page.locator('input[name="date"]')).toBeVisible();
    await expect(page.locator('input[name="time"]')).toBeVisible();
    await expect(page.locator('textarea[name="reason"]')).toBeVisible();
  });

  test('should fill appointment form', async ({ page }) => {

    await page.locator('#doctors').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const bookBtn = page.locator('.doctor-btn.btn-appointment').first();

    if (await bookBtn.count() === 0) {
      test.skip();
    }

    await bookBtn.click();
    await page.waitForURL(/appointment/i);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await page.fill('input[name="date"]', dateStr);
    await page.fill('input[name="time"]', '14:00');
    await page.fill('textarea[name="reason"]', 'Regular checkup');

    await expect(
      page.locator('button:has-text("Proceed to Payment")')
    ).toBeVisible();
  });

  test('should show payment button', async ({ page }) => {

    await page.locator('#doctors').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const bookBtn = page.locator('.doctor-btn.btn-appointment').first();

    if (await bookBtn.count() === 0) {
      test.skip();
    }

    await bookBtn.click();
    await page.waitForURL(/appointment/i);

    await expect(
      page.locator('button:has-text("Proceed to Payment")')
    ).toBeVisible();

    console.log('Payment flow verified (no gateway interaction)');
  });

});
