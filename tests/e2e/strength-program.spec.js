import { test, expect } from '@playwright/test';
import { login, logout, navigateToTab } from '../helpers.js';

const PROGRAM_NAME = 'E2E Back Squat Cycle';
const EXERCISE = 'Back Squat';

test.describe('Strength Program', () => {

  test('coach can create a strength program', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Click "New Program" button
    const newProgramBtn = page.locator('button:has-text("New Program")');
    await newProgramBtn.scrollIntoViewIfNeeded();
    await newProgramBtn.click();

    // Verify form is shown
    await expect(page.locator('text=New Strength Program')).toBeVisible({ timeout: 5000 });

    // Fill in program details
    await page.fill('input[placeholder="e.g., Back Squat Cycle"]', PROGRAM_NAME);
    await page.fill('input[placeholder="e.g., Back Squat"]', EXERCISE);

    // Set duration to 1 week
    const weeksInput = page.locator('label:has-text("Duration (weeks)") + input');
    await weeksInput.fill('1');

    // Set sessions/week to 2
    const sessionsInput = page.locator('label:has-text("Sessions / week") + input');
    await sessionsInput.fill('2');

    // Wait for session rows to appear
    await page.waitForTimeout(500);

    // Fill in session details (S1 and S2)
    const sessionRows = page.locator('.flex.items-center.gap-2.bg-slate-700');

    // S1: 5 sets x 5 reps @ 70%
    const s1 = sessionRows.nth(0);
    await s1.locator('input[placeholder="Sets"]').fill('5');
    await s1.locator('input[placeholder="Reps"]').fill('5');
    await s1.locator('input[placeholder="%"]').fill('70');

    // S2: 3 sets x 3 reps @ 80%
    const s2 = sessionRows.nth(1);
    await s2.locator('input[placeholder="Sets"]').fill('3');
    await s2.locator('input[placeholder="Reps"]').fill('3');
    await s2.locator('input[placeholder="%"]').fill('80');

    // Submit — handle the alert dialog
    const dialogPromise = page.waitForEvent('dialog');

    const createBtn = page.locator('button:has-text("Create Program")');
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('created');
    await dialog.accept();

    // Wait for list view to return
    await page.waitForTimeout(1000);

    // Verify the program appears in the list
    await expect(page.locator(`text=${PROGRAM_NAME}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=DRAFT').first()).toBeVisible();
  });

  test('coach can activate a program', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Wait for programs to load
    await page.waitForTimeout(1000);

    // Find the program card and click to expand
    const programCard = page.locator(`text=${PROGRAM_NAME}`);
    await programCard.scrollIntoViewIfNeeded();
    await programCard.click();

    // Wait for expanded content
    await page.waitForTimeout(500);

    // Click Activate button
    const activateBtn = page.locator('button:has-text("Activate")');
    await expect(activateBtn).toBeVisible({ timeout: 5000 });

    const dialogPromise = page.waitForEvent('dialog');
    await activateBtn.click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('activated');
    await dialog.accept();

    await page.waitForTimeout(1000);

    // Verify status badge changes to ACTIVE
    await expect(page.locator('text=ACTIVE').first()).toBeVisible({ timeout: 5000 });
  });

  // NOTE: Tests 3 and 4 depend on the program being ACTIVE from test 2.
  // The deactivate test runs AFTER the athlete tests.

  test('athlete sees 1RM enrollment prompt when program is active', async ({ page }) => {
    // Program is active from test 2, login directly as athlete
    await login(page, 'athlete');
    await page.waitForTimeout(2000);

    // Should see the OneRepMaxPrompt on the home dashboard
    const prompt = page.locator(`text=${PROGRAM_NAME}`);
    await prompt.scrollIntoViewIfNeeded();
    await expect(prompt).toBeVisible({ timeout: 10000 });

    // Should also show the exercise name
    await expect(page.locator(`text=${EXERCISE}`).first()).toBeVisible();

    // Should see the input prompt for 1RM
    await expect(page.locator('text=1RM to get started')).toBeVisible();
  });

  test('athlete can enter 1RM and enroll', async ({ page }) => {
    // Program is still active from test 2
    await login(page, 'athlete');
    await page.waitForTimeout(2000);

    // Find the 1RM input (number input with placeholder "e.g., 120")
    const oneRmInput = page.locator('input[placeholder="e.g., 120"]');
    await oneRmInput.scrollIntoViewIfNeeded();
    await expect(oneRmInput).toBeVisible({ timeout: 10000 });

    // Enter a 1RM value
    await oneRmInput.fill('120');

    // Click Save
    const saveBtn = page.locator('button:has-text("Save")');
    await saveBtn.click();

    // Wait for enrollment to complete
    await page.waitForTimeout(2000);

    // After enrollment, should see compact display with the 1RM value
    await expect(page.locator('text=120 kg')).toBeVisible({ timeout: 5000 });

    // Should see the Update link
    await expect(page.locator('text=Update')).toBeVisible();
  });

  test('coach posts WOD with program attached and sees Part A on Home', async ({ page }) => {
    // Program is active from test 2, login as coach
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Click "New WOD" to open the WOD form
    const newWodBtn = page.locator('button:has-text("New WOD")');
    await newWodBtn.scrollIntoViewIfNeeded();
    await newWodBtn.click();

    // Wait for the WOD form to appear
    await expect(page.locator('text=Post New WOD')).toBeVisible({ timeout: 5000 });
    // Give time for active program data to load so the Attach checkbox renders
    await page.waitForTimeout(2000);

    // Check the "Attach" checkbox for the active strength program
    // Click the label to trigger React's onChange handler properly
    const attachLabel = page.locator('label:has-text("Attach:")');
    await expect(attachLabel).toBeVisible({ timeout: 10000 });
    await attachLabel.scrollIntoViewIfNeeded();
    await attachLabel.click();
    // Verify checkbox is now checked
    const attachCheckbox = page.locator('label:has-text("Attach:") input[type="checkbox"]');
    await expect(attachCheckbox).toBeChecked();

    // Set session override to 1 so coach (unenrolled) can see Part A on Home
    const sessionOverrideInput = page.locator('input[placeholder="Auto"]');
    await expect(sessionOverrideInput).toBeVisible({ timeout: 5000 });
    await sessionOverrideInput.fill('1');

    // Fill in a movement for Part B
    await page.fill('input[placeholder="Type to search movements..."]', 'Burpees');
    await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', '10 reps');

    // Accept any dialog (success or conflict)
    const dialogPromise = page.waitForEvent('dialog');
    const postBtn = page.locator('button:has-text("Post WOD")');
    await postBtn.scrollIntoViewIfNeeded();
    await postBtn.click();
    const dialog = await dialogPromise;
    await dialog.accept();

    // Wait for WOD to be saved and form to close
    await page.waitForTimeout(2000);

    // Navigate to Home tab to verify Part A display
    await navigateToTab(page, 'Home');
    await page.waitForTimeout(3000);

    // Should see the Part A badge
    const partA = page.locator('text=Part A').first();
    await expect(partA).toBeVisible({ timeout: 15000 });

    // Should see the exercise name in the Part A section
    await expect(page.locator(`text=${EXERCISE}`).first()).toBeVisible({ timeout: 5000 });

    // Should see sets x reps @ % format (rendered as "5 sets x 5 reps @ 70% of 1RM")
    await expect(page.locator('text=sets').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=of 1RM').first()).toBeVisible({ timeout: 5000 });

    // Should see the Part B badge above the movements
    await expect(page.locator('text=Part B').first()).toBeVisible({ timeout: 5000 });
  });

  test('athlete sees Part A with working weight on Home', async ({ page }) => {
    // Athlete enrolled with 1RM=120 in earlier test, WOD posted with program attached
    await login(page, 'athlete');
    await page.waitForTimeout(3000);

    // Should see the Part A badge on the home dashboard
    const partA = page.locator('text=Part A').first();
    await expect(partA).toBeVisible({ timeout: 15000 });

    // Should see the exercise name
    await expect(page.locator(`text=${EXERCISE}`).first()).toBeVisible({ timeout: 5000 });

    // Should see sets x reps @ % format
    await expect(page.locator('text=sets').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=of 1RM').first()).toBeVisible({ timeout: 5000 });

    // Should see the Part B badge
    await expect(page.locator('text=Part B').first()).toBeVisible({ timeout: 5000 });

    // Since athlete enrolled with 1RM of 120 kg, should see working weight
    await expect(page.locator('text=Working weight').first()).toBeVisible({ timeout: 5000 });
  });

  test('coach override rejects invalid session number', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    await page.waitForTimeout(1000);

    // Expand the active program card
    const programCard = page.locator(`text=${PROGRAM_NAME}`);
    await programCard.scrollIntoViewIfNeeded();
    await programCard.click();

    await page.waitForTimeout(500);

    // Locate the override input and enter 0 (invalid — must be >= 1)
    const overrideInput = page.locator('input[placeholder="#"]');
    await overrideInput.scrollIntoViewIfNeeded();
    await expect(overrideInput).toBeVisible({ timeout: 5000 });
    await overrideInput.fill('0');

    // Register dialog handler BEFORE click — accepts immediately to prevent click hang
    let overrideDialogMessage = '';
    page.once('dialog', async (dialog) => {
      overrideDialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click Override — alert fires synchronously and is handled by the once listener
    await page.locator('button:has-text("Override")').click();
    await page.waitForTimeout(500);

    expect(overrideDialogMessage).toContain('valid session number');
  });

  test('athlete cannot enter invalid 1RM', async ({ page }) => {
    // Athlete is already enrolled (from earlier test), click Update to re-open the form
    await login(page, 'athlete');
    await page.waitForTimeout(2000);

    // The compact enrolled view shows an "Update" button
    const updateBtn = page.locator('button:has-text("Update")').first();
    await updateBtn.scrollIntoViewIfNeeded();
    await expect(updateBtn).toBeVisible({ timeout: 10000 });
    await updateBtn.click();

    // The edit form is now open — clear the input and enter 0
    const oneRmInput = page.locator('input[placeholder="e.g., 120"]');
    await oneRmInput.scrollIntoViewIfNeeded();
    await expect(oneRmInput).toBeVisible({ timeout: 5000 });
    await oneRmInput.fill('0');

    // Submit — the button reads "Update" when editing an existing enrollment
    const saveBtn = page.locator('button:has-text("Update")').last();
    await saveBtn.click();

    // Inline error should appear (not an alert)
    await expect(page.locator('text=Enter a valid weight in kg')).toBeVisible({ timeout: 3000 });
  });

  test('coach can deactivate a program', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    await page.waitForTimeout(1000);

    // Expand the active program card
    const programCard = page.locator(`text=${PROGRAM_NAME}`);
    await programCard.scrollIntoViewIfNeeded();
    await programCard.click();

    await page.waitForTimeout(500);

    // Click Deactivate
    const deactivateBtn = page.locator('button:has-text("Deactivate")');
    await expect(deactivateBtn).toBeVisible({ timeout: 5000 });

    const dialogPromise = page.waitForEvent('dialog');
    await deactivateBtn.click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('deactivated');
    await dialog.accept();

    await page.waitForTimeout(1000);

    // Verify status is no longer ACTIVE — should be COMPLETED
    await expect(page.locator(`text=${PROGRAM_NAME}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=COMPLETED').first()).toBeVisible({ timeout: 5000 });
  });

  test('athlete no longer sees enrollment prompt after deactivation', async ({ page }) => {
    // Program was deactivated in the previous test
    await login(page, 'athlete');
    await page.waitForTimeout(2000);

    // The OneRepMaxPrompt should NOT be visible (no active program)
    await expect(page.locator('text=1RM to get started')).not.toBeVisible();

    // The compact enrolled display (showing kg) should also be gone
    await expect(page.locator('text=120 kg')).not.toBeVisible();
  });
});
