// ===================================================================
// FILE: tests/e2e/auth.spec.js (FIXED)
// ===================================================================
const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  
  test('should register new patient', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Use unique email for each test run
    const uniqueEmail = `testpatient${Date.now()}@example.com`;
    
    // Fill registration form
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirm_password"]', 'password123');
    await page.selectOption('select[name="role"]', 'patient');
    
    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // Should redirect to login or stay on register with success message
    const currentUrl = page.url();
    const hasLoginInUrl = currentUrl.includes('login');
    const hasSuccessMessage = await page.locator('.alert-success, text=successful').isVisible().catch(() => false);
    
    expect(hasLoginInUrl || hasSuccessMessage).toBeTruthy();
  });

  test('should login as patient', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill login form
    await page.fill('input[name="email"]', 'testpatient@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*patient\/dashboard/);
    
    // Check for dashboard heading (more specific selector)
    await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'testpatient@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // Wait for dashboard
    await page.waitForURL(/.*patient\/dashboard/);
    
    // Click logout in sidebar (more specific selector)
    await page.locator('.sidebar a[href="/auth/logout"]').click();
    
    // Wait for redirect
    await page.waitForURL(/.*login/);
    await expect(page).toHaveURL(/.*login/);
  });
});
