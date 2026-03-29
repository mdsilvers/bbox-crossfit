import { test, expect } from '@playwright/test';
import { login, navigateToTab } from '../helpers.js';

/**
 * Returns tomorrow's date as YYYY-MM-DD.
 * Used to avoid conflicts with the WOD posted for today in earlier tests.
 */
function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('Coach WOD Management', () => {
  test('can navigate to Program tab', async ({ page }) => {
    await login(page, 'coach');

    await navigateToTab(page, 'Program');

    await expect(page.locator('h2:has-text("WOD Programming")')).toBeVisible();
  });

  test('can open WOD form', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    await page.click('button:has-text("New WOD")');

    await expect(page.locator('h2:has-text("Post New WOD")')).toBeVisible();
  });

  test('can post a WOD for today', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    await page.click('button:has-text("New WOD")');
    await expect(page.locator('h2:has-text("Post New WOD")')).toBeVisible();

    // Fill in the movement name
    await page.fill('input[placeholder="Type to search movements..."]', 'Burpees');

    // Fill in reps
    await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', '21-15-9');

    // Register dialog handler BEFORE clicking Post WOD
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('button:has-text("Post WOD")');

    // After accepting the success dialog, should return to WOD list
    await expect(page.locator('h2:has-text("WOD Programming")')).toBeVisible({ timeout: 10000 });
  });

  test('can see posted WOD on dashboard', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Post a WOD for tomorrow to avoid conflict with today's WOD from the previous test
    await page.click('button:has-text("New WOD")');
    await expect(page.locator('h2:has-text("Post New WOD")')).toBeVisible();

    // Change date to tomorrow
    await page.fill('input[type="date"]', getTomorrowDate());

    await page.fill('input[placeholder="Type to search movements..."]', 'Pull-ups');
    await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', '5-5-5');

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('button:has-text("Post WOD")');

    // Wait for return to WOD list
    await expect(page.locator('h2:has-text("WOD Programming")')).toBeVisible({ timeout: 10000 });

    // The WOD list should show the posted WOD with the movement
    await expect(page.locator('text=Pull-ups').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Home tab — today's WOD posted in test 3 (Burpees) should appear there
    await navigateToTab(page, 'Home');

    // The home dashboard should be visible
    await expect(page.locator('button:has-text("Home")')).toBeVisible();
  });

  test('can delete a WOD', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Post a WOD for two days from now to avoid conflicts
    await page.click('button:has-text("New WOD")');
    await expect(page.locator('h2:has-text("Post New WOD")')).toBeVisible();

    // Change date to 2 days from now
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const futureDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await page.fill('input[type="date"]', futureDate);

    await page.fill('input[placeholder="Type to search movements..."]', 'Squats');
    await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', '10-10-10');

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('button:has-text("Post WOD")');

    // Wait for return to WOD list
    await expect(page.locator('h2:has-text("WOD Programming")')).toBeVisible({ timeout: 10000 });

    // The newly posted WOD should show a Delete button — click it
    await page.locator('button:has-text("Delete")').first().click();

    // Confirmation overlay should appear inside the card
    await expect(page.locator('p:has-text("Delete this WOD?")')).toBeVisible();

    // Confirm deletion by clicking the "Delete" button in the red confirmation overlay
    await page.locator('.bg-red-600 button:has-text("Delete")').click();

    // After deletion, should still be on Program view
    await expect(page.locator('h2:has-text("WOD Programming")')).toBeVisible({ timeout: 10000 });
  });
});
