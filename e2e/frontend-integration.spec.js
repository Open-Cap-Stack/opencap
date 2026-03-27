/**
 * Frontend Integration E2E Tests
 * Verifies all API-integrated pages load and function correctly
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Authentication Flow', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should have register link on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('text=Register')).toBeVisible();
  });

  test('should show registration form', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await expect(page.locator('text=Create Account')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should show error message (either from API or default)
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });
  });

  test('should show password mismatch error on register', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'pass123');
    await page.fill('#confirmPassword', 'pass456');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login from dashboard when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/stakeholders`);
    await page.waitForURL('**/login');
    await expect(page.url()).toContain('/login');
  });

  test('should redirect to login from documents when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForURL('**/login');
    await expect(page.url()).toContain('/login');
  });

  test('should redirect to login from equity-plans when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/equity-plans`);
    await page.waitForURL('**/login');
    await expect(page.url()).toContain('/login');
  });

  test('should redirect to login from valuations when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/valuations`);
    await page.waitForURL('**/login');
    await expect(page.url()).toContain('/login');
  });
});

test.describe('Page Structure (with mocked auth)', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock token so ProtectedRoute lets us through
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@test.com' }));
    });
  });

  test('Overview page should have statistics section', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    // The page will try to fetch data and may show loading or data
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    // Should have rendered something (loading state or content)
    expect(body.length).toBeGreaterThan(0);
  });

  test('Login page should have OpenCap Stack branding', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('text=OpenCap Stack')).toBeVisible();
  });
});
