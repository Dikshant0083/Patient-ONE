
// FILE: tests/e2e/helpers/auth-helper.js
async function loginAsPatient(page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'testpatient@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*patient\/dashboard/);
}

async function loginAsDoctor(page) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'testdoctor@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*doctor\/dashboard/);
}

module.exports = { loginAsPatient, loginAsDoctor };
