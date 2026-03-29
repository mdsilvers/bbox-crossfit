import { test, expect } from '@playwright/test';
import { login } from '../helpers.js';

test.describe('Authentication', () => {
  test('shows login form on initial load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');

    // Wait for error message to appear
    await expect(page.locator('p.text-red-400')).toBeVisible({ timeout: 10000 });
  });

  test('coach can log in and see dashboard', async ({ page }) => {
    await login(page, 'coach');

    // Coach should see Home in the nav
    await expect(page.locator('button:has-text("Home")')).toBeVisible();

    // Coach-specific tabs
    await expect(page.locator('button:has-text("Program")')).toBeVisible();
    await expect(page.locator('button:has-text("Athletes")')).toBeVisible();
  });

  test('athlete can log in and see dashboard', async ({ page }) => {
    await login(page, 'athlete');

    // Athlete should see Home in the nav
    await expect(page.locator('button:has-text("Home")')).toBeVisible();
    await expect(page.locator('button:has-text("History")')).toBeVisible();

    // Athlete should NOT see coach-only tabs
    await expect(page.locator('button:has-text("Program")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Athletes")')).not.toBeVisible();
  });

  test('shows signup form when clicking Sign Up', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    await page.click('button:has-text("Sign Up")');

    // Signup form should appear with "Create Account" heading
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible();
    await expect(page.locator('input[placeholder="John Smith"]')).toBeVisible();
  });

  test('shows forgot password form when clicking Forgot password?', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    await page.click('button:has-text("Forgot password?")');

    // Forgot password form should appear with "Reset Password" heading
    await expect(page.locator('h2:has-text("Reset Password")')).toBeVisible();
    await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible();
    await expect(page.locator('button:has-text("Back to Login")')).toBeVisible();
  });
});
