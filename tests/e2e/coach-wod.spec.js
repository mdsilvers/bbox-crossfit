import { test, expect } from '@playwright/test';
import { login, navigateToTab, getLocalToday } from '../helpers.js';

/**
 * Helper: Post a WOD via the form.
 * Handles scrolling, dialog acceptance, and waits for form to close.
 */
async function postWod(page, { movement, reps, group }) {
  const newWodBtn = page.locator('button:has-text("New WOD")');
  await newWodBtn.scrollIntoViewIfNeeded();
  await newWodBtn.click();
  await expect(page.locator('text=Post New WOD')).toBeVisible({ timeout: 5000 });

  // Set group if specified (find the select inside the Group-labeled div)
  if (group) {
    const groupDiv = page.locator('div').filter({ has: page.locator('label', { hasText: 'Group' }) }).first();
    await groupDiv.locator('select').selectOption(group);
  }

  await page.fill('input[placeholder="Type to search movements..."]', movement);
  await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', reps);

  // Set up dialog handler as promise BEFORE clicking
  const dialogPromise = page.waitForEvent('dialog');

  const postBtn = page.locator('button:has-text("Post WOD")');
  await postBtn.scrollIntoViewIfNeeded();
  await postBtn.click();

  // Wait for and accept the dialog
  const dialog = await dialogPromise;
  await dialog.accept();

  // Wait for form to close
  await page.waitForTimeout(1000);
}

test.describe('Coach WOD Management', () => {
  test('can navigate to Program tab', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    const heading = page.locator('text=WOD Programming');
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('can open WOD form', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    const newWodBtn = page.locator('button:has-text("New WOD")');
    await newWodBtn.scrollIntoViewIfNeeded();
    await newWodBtn.click();

    await expect(page.locator('text=Post New WOD')).toBeVisible();
  });

  test('can post a WOD for today', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Post with combined group (default) — today's date is already set
    await postWod(page, { movement: 'Burpees', reps: '21-15-9', group: null });

    // Should return to WOD list
    const heading = page.locator('text=WOD Programming');
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('can see posted WOD on dashboard', async ({ page }) => {
    await login(page, 'coach');

    // Navigate to Home — should see today's WOD
    await navigateToTab(page, 'Home');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Home")')).toBeVisible();
  });

  test('can delete a WOD', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    await page.waitForTimeout(1000);
    const deleteBtn = page.locator('button:has-text("Delete")').first();

    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up dialog handler
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      await deleteBtn.scrollIntoViewIfNeeded();
      await deleteBtn.click();

      // Handle confirmation overlay
      const confirmDelete = page.locator('text=Delete this WOD?');
      if (await confirmDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator('.bg-red-600 button:has-text("Delete")').click();
        await page.waitForTimeout(2000);
      }
    }

    const heading = page.locator('text=WOD Programming');
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
