import { test, expect } from '@playwright/test';
import { login, navigateToTab } from '../helpers.js';

test.describe('History and score display', () => {
  test('coach can view history tab', async ({ page }) => {
    await login(page, 'coach');

    await navigateToTab(page, 'History');

    // History heading should appear
    await expect(page.locator('h2:has-text("Workout History")')).toBeVisible({ timeout: 10000 });

    // Should show either the empty state or workout cards (search bar always present)
    const searchInput = page.locator('input[placeholder="Search by workout name or date..."]');
    await expect(searchInput).toBeVisible();

    // Either empty state or results list
    const emptyState = page.locator('p:has-text("No workouts logged yet")');
    const resultsList = page.locator('p:has-text("workout")').filter({ hasText: /found/ });
    const hasEmpty = await emptyState.isVisible();
    const hasResults = await resultsList.isVisible();
    expect(hasEmpty || hasResults).toBe(true);
  });

  test('athlete can view history tab', async ({ page }) => {
    await login(page, 'athlete');

    await navigateToTab(page, 'History');

    // Search bar is always shown in the athlete history view
    const searchInput = page.locator('input[placeholder="Search by workout name or date..."]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Either empty state or workout count
    const emptyState = page.locator('p:has-text("No workouts logged yet")');
    const resultsList = page.locator('p:has-text("workout")').filter({ hasText: /found/ });
    const hasEmpty = await emptyState.isVisible();
    const hasResults = await resultsList.isVisible();
    expect(hasEmpty || hasResults).toBe(true);
  });

  test('coach can view athletes tab', async ({ page }) => {
    await login(page, 'coach');

    await navigateToTab(page, 'Athletes');

    // Athletes heading should appear
    await expect(page.locator('h2:has-text("Athletes")')).toBeVisible({ timeout: 10000 });

    // Either empty state or athlete cards
    const emptyState = page.locator('p:has-text("No athletes have logged workouts yet")');
    const athleteCards = page.locator('.bg-slate-800.rounded-lg.border.border-slate-700');
    const hasEmpty = await emptyState.isVisible();
    const hasAthletes = (await athleteCards.count()) > 0;
    expect(hasEmpty || hasAthletes).toBe(true);
  });

  test('coach can view progress tab', async ({ page }) => {
    await login(page, 'coach');

    await navigateToTab(page, 'Progress');

    // Progress tab renders the ProgressDashboard — WeeklySummary is always shown at top
    // Wait for the page to stabilize after navigation
    await page.waitForTimeout(1000);

    // The progress view should have rendered something (no crash)
    // Check for any of the section headings that always render
    // At minimum the container should be present without throwing
    const container = page.locator('.min-h-screen');
    await expect(container).toBeVisible();

    // Verify we are NOT still on the Home tab (navigation worked)
    await expect(page.locator('h2:has-text("Workout History")')).not.toBeVisible();
  });

  test('athlete can view progress tab', async ({ page }) => {
    await login(page, 'athlete');

    await navigateToTab(page, 'Progress');

    // Wait for the page to stabilize after navigation
    await page.waitForTimeout(1000);

    // The progress view should have rendered without crashing
    const container = page.locator('.min-h-screen');
    await expect(container).toBeVisible();

    // Verify we are NOT still on the Home or History tab (navigation worked)
    await expect(page.locator('input[placeholder="Search by workout name or date..."]')).not.toBeVisible();
  });
});
