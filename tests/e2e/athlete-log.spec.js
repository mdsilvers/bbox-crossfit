import { test, expect, devices } from '@playwright/test';
import { login } from '../helpers.js';

/**
 * E2E tests for athlete workout logging.
 *
 * beforeAll: Log in as coach and post today's WOD so the athlete has something to see.
 *
 * Test order matters: tests run sequentially and share Supabase state.
 * Tests 1-2 run before any result is logged; test 3 logs a result; test 4 uses
 * the existing result state.
 */

test.describe('Athlete Workout Logging', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    const page = await context.newPage();

    try {
      // Log in as coach
      await login(page, 'coach');

      // Navigate to Program tab
      await page.click('button:has-text("Program")');
      await page.waitForTimeout(500);

      // Scroll down and click "New WOD" button (below Strength Programs section)
      const newWodBtn = page.locator('button:has-text("New WOD")');
      await newWodBtn.scrollIntoViewIfNeeded();
      await newWodBtn.click();
      await page.waitForSelector('text=Post New WOD', { timeout: 10000 });

      // Date defaults to today — no need to change it

      // Fill in a movement name
      const movementInput = page.locator('input[placeholder="Type to search movements..."]').first();
      await movementInput.fill('Pull-ups');
      await page.waitForTimeout(300);

      // Fill in reps
      const repsInput = page.locator('input[placeholder="Reps (e.g., 21-15-9)"]').first();
      await repsInput.fill('21-15-9');

      // Set up dialog handler as promise BEFORE clicking
      const dialogPromise = page.waitForEvent('dialog');

      // Scroll to and submit the WOD
      const postBtn = page.locator('button:has-text("Post WOD")');
      await postBtn.scrollIntoViewIfNeeded();
      await postBtn.click();

      // Wait for and accept the dialog
      const dialog = await dialogPromise;
      await dialog.accept();

      // Wait for the form to close
      await page.waitForTimeout(2000);
    } finally {
      await context.close();
    }
  });

  test('athlete sees today\'s WOD on dashboard', async ({ page }) => {
    await login(page, 'athlete');

    // Should be on the home/dashboard view by default
    await page.waitForSelector('button:has-text("Home")', { timeout: 15000 });

    // Wait for WOD content to load
    await page.waitForTimeout(2000);

    // Today's WOD section should be visible
    // It will show either "Today's WOD" heading or the "Log My Workout" button
    const wodIndicator = page
      .locator('h3:has-text("Today\'s WOD")')
      .or(page.locator('button:has-text("Log My Workout")'))
      .or(page.locator('text=Not logged yet'));

    await expect(wodIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('athlete can navigate to workout form', async ({ page }) => {
    await login(page, 'athlete');

    // Wait for dashboard to load
    await page.waitForSelector('button:has-text("Home")', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click "Log My Workout" button (or "Edit My Results" if already logged)
    const actionButton = page
      .locator('button:has-text("Log My Workout")')
      .or(page.locator('button:has-text("Edit My Results")'))
      .first();

    await expect(actionButton).toBeVisible({ timeout: 10000 });
    await actionButton.click();

    // Should now be on the workout view showing "Today's WOD" heading
    await expect(page.locator('h2:has-text("Today\'s WOD")')).toBeVisible({ timeout: 10000 });
  });

  test('athlete can start a custom workout', async ({ page }) => {
    await login(page, 'athlete');

    // Wait for dashboard to load
    await page.waitForSelector('button:has-text("Home")', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Look for "Did a different workout? Log custom WOD" button on home dash
    // This is only shown when the athlete hasn't completed today's WOD yet
    const customButton = page.locator('button:has-text("Did a different workout? Log custom WOD")');

    if (await customButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await customButton.click();
      // Should now show the Custom Workout form
      await expect(page.locator('h2:has-text("Custom Workout")')).toBeVisible({ timeout: 10000 });
    } else {
      // Athlete may have already logged today's WOD (from a prior test).
      // In this case, delete the result to get back to unlogged state.
      // Scroll down to "Recent Workouts" section and delete today's result.
      const deleteButton = page.locator('button:has-text("Delete")').first();

      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        // Confirm deletion
        const confirmDelete = page.locator('button:has-text("Delete")').first();
        await confirmDelete.click();
        await page.waitForTimeout(1000);
      }

      // Now the custom workout button should appear
      await expect(page.locator('button:has-text("Did a different workout? Log custom WOD")')).toBeVisible({ timeout: 10000 });
      await page.click('button:has-text("Did a different workout? Log custom WOD")');

      // Should now show the Custom Workout form
      await expect(page.locator('h2:has-text("Custom Workout")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('athlete can log a workout result', async ({ page }) => {
    await login(page, 'athlete');

    // Wait for dashboard to load
    await page.waitForSelector('button:has-text("Home")', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click "Log My Workout" button (should be available as custom workout was cancelled)
    const logButton = page
      .locator('button:has-text("Log My Workout")')
      .or(page.locator('button:has-text("Edit My Results")'))
      .first();

    await expect(logButton).toBeVisible({ timeout: 10000 });
    await logButton.click();

    // Wait for the workout form
    await page.waitForSelector('h2:has-text("Today\'s WOD")', { timeout: 10000 });

    // Fill in the score — "For Time" shows minutes and seconds inputs
    const minutesInput = page.locator('input[placeholder="MM"]');
    const secondsInput = page.locator('input[placeholder="SS"]');

    if (await minutesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await minutesInput.fill('10');
      await secondsInput.fill('30');
    }

    // Register dialog handler BEFORE clicking submit
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click the submit button
    const submitButton = page.locator('button:has-text("Log Workout"), button:has-text("Update Workout")').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Wait for success state
    await page.waitForTimeout(2000);

    // Check for success — button should now say "Update Workout" or show "Already Logged"
    const successIndicator = page
      .locator('button:has-text("Update Workout")')
      .or(page.locator('text=Already Logged'))
      .or(page.locator('button:has-text("Edit My Results")')); // back on home dash

    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
  });
});
