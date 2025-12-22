
// ===================================================================
// FILE: tests/e2e/patient-dashboard.spec.js (FIXED)
// ===================================================================
const { test: dashTest, expect: dashExpect } = require('@playwright/test');

dashTest.describe('Patient Dashboard', () => {
  
  dashTest.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'testpatient@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    await page.waitForURL(/.*patient\/dashboard/);
  });

  dashTest('should display dashboard stats', async ({ page }) => {
    // Check stats are visible (more specific selectors)
    await dashExpect(page.locator('.stat-label:has-text("Total Records")')).toBeVisible();
    await dashExpect(page.locator('.stat-label:has-text("Authorized Doctors")')).toBeVisible();
    await dashExpect(page.locator('.stat-label:has-text("Confirmed Appointments")')).toBeVisible();
  });

  dashTest('should upload medical record', async ({ page }) => {
    // Fill upload form
    await page.fill('input[name="title"]', 'Test Blood Report');
    await page.fill('textarea[name="description"]', 'Annual checkup results');
    
    // Upload file
    await page.setInputFiles('input[type="file"]', {
      name: 'test-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content'),
    });
    
    // Submit
    await page.click('button:has-text("Upload Record")');
    
    // Wait for page reload
    await page.waitForLoadState('networkidle');
    
    // Should show success message (first visible match)
    await dashExpect(page.locator('.alert-success').first()).toBeVisible();
    await dashExpect(page.locator('text=Test Blood Report').first()).toBeVisible();
  });

  dashTest('should navigate to medical records page', async ({ page }) => {
    await page.click('a[href*="/records/patient"]');
    await page.waitForURL(/.*records\/patient/);
    
    // Check for heading (specific selector)
    await dashExpect(page.locator('h1:has-text("Medical Records")').first()).toBeVisible();
  });
});
