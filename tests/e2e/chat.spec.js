const { test, expect } = require('@playwright/test');

test.describe('Chat Functionality', () => {

  test('should open chat with doctor', async ({ page }) => {

    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'testpatient@example.com');
    await page.fill('input[name="password"]', 'password123');

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(/patient\/dashboard/);

    await page.locator('#doctors').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const chatBtn = page.locator('.doctor-btn.btn-chat').first();

    if (await chatBtn.count() === 0) {
      test.skip();
    }

    await chatBtn.click();

    await page.waitForURL(/chat/i);

    await expect(page.locator('#msg-input')).toBeVisible();
    await expect(page.locator('#send-btn')).toBeVisible();
  });

  test('should send message', async ({ page }) => {

    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'testpatient@example.com');
    await page.fill('input[name="password"]', 'password123');

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(/patient\/dashboard/);

    await page.locator('#doctors').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const chatBtn = page.locator('.doctor-btn.btn-chat').first();

    if (await chatBtn.count() === 0) {
      test.skip();
    }

    await chatBtn.click();
    await page.waitForURL(/chat/i);

    // Send message
    await page.fill('#msg-input', 'Hello Doctor');
    await page.click('#send-btn');

    // Wait for socket update
    await page.waitForTimeout(800);

    // ✅ STRICT-MODE SAFE ASSERTION
    await expect(
      page.locator('.message-text').last()
    ).toHaveText('Hello Doctor');
  });

});
