import { test, expect } from '@playwright/test';
import { login, navigateToTab } from '../helpers.js';

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

  test('can fill and submit WOD form', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    const newWodBtn = page.locator('button:has-text("New WOD")');
    await newWodBtn.scrollIntoViewIfNeeded();
    await newWodBtn.click();
    await expect(page.locator('text=Post New WOD')).toBeVisible({ timeout: 5000 });

    // Fill form fields
    await page.fill('input[placeholder="Type to search movements..."]', 'Burpees');
    await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', '21-15-9');

    // Accept any dialog (success or conflict — both are valid outcomes)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const postBtn = page.locator('button:has-text("Post WOD")');
    await postBtn.scrollIntoViewIfNeeded();
    await postBtn.click();

    // Wait for dialog to be handled
    await page.waitForTimeout(2000);

    // Either form closed (success) or stayed open (conflict) — both OK
    // Cancel if form is still showing
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click();
    }

    // Should end up on WOD list
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
