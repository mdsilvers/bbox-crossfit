import { test, expect } from '@playwright/test';
import { login, logout, navigateToTab } from '../helpers.js';

const PROGRAM_NAME = 'E2E Back Squat Cycle';
const EXERCISE = 'Back Squat';

/**
 * Helper: register a dialog handler before an action to avoid click-hang.
 * Returns a getter for the captured dialog message.
 */
function captureNextDialog(page) {
  let message = '';
  page.once('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.accept();
  });
  return () => message;
}

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

    // Submit — register dialog handler before click to avoid click-hang on alert
    captureNextDialog(page);
    const createBtn = page.locator('button:has-text("Create Program")');
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();

    // Verify the program appears in the list (dialog accepted by handler above)
    await expect(page.locator(`text=${PROGRAM_NAME}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=DRAFT').first()).toBeVisible();
  });

  test('coach can activate a program', async ({ page }) => {
    await login(page, 'coach');
    await navigateToTab(page, 'Program');

    // Wait for the program card to appear and click to expand
    const programCardBtn = page.locator(`button:has-text("${PROGRAM_NAME}")`).first();
    await expect(programCardBtn).toBeVisible({ timeout: 10000 });
    await programCardBtn.scrollIntoViewIfNeeded();
    await programCardBtn.click();

    // Click Activate button
    const activateBtn = page.locator('button:has-text("Activate")');
    await expect(activateBtn).toBeVisible({ timeout: 5000 });

    // Register dialog handler before click to avoid click-hang on alert
    captureNextDialog(page);
    await activateBtn.click();

    // Verify status badge changes to ACTIVE (dialog is accepted by handler above)
    await expect(page.locator('text=ACTIVE').first()).toBeVisible({ timeout: 10000 });
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

    // Reload to ensure clean state with active program loaded
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("Home")', { timeout: 15000 });
    await navigateToTab(page, 'Program');

    // Wait for data to load — ensure WOD Programming section is rendered
    await expect(page.locator('text=WOD Programming')).toBeVisible({ timeout: 10000 });

    // Wait for active program card to confirm activeProgram state is loaded.
    // The Attach checkbox in the WOD form only renders when activeProgram is set.
    await expect(page.locator(`text=${PROGRAM_NAME}`).first()).toBeVisible({ timeout: 10000 });

    // Check if a WOD already exists for today (posted by other spec files).
    // Use "Edit WOD" button as the indicator — it only appears on WOD cards,
    // not on strength program cards, so it's a safe selector.
    const editWodBtn = page.locator('button:has-text("Edit WOD")').first();
    const hasExistingWod = await editWodBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasExistingWod) {
      // Edit the existing WOD to attach the strength program
      await editWodBtn.scrollIntoViewIfNeeded();
      await editWodBtn.click();
      await expect(page.locator('text=Edit WOD').first()).toBeVisible({ timeout: 5000 });
    } else {
      // No existing WOD — create a new one
      const newWodBtn = page.locator('button:has-text("New WOD")');
      await newWodBtn.scrollIntoViewIfNeeded();
      await newWodBtn.click();
      await expect(page.locator('text=Post New WOD')).toBeVisible({ timeout: 5000 });

      // Fill in a movement (only needed for new WODs — edit has them already)
      await page.fill('input[placeholder="Type to search movements..."]', 'Burpees');
      await page.waitForTimeout(300);
      await page.fill('input[placeholder="Reps (e.g., 21-15-9)"]', '10 reps');
    }

    // Wait for the Attach checkbox to render (depends on activeProgram async data)
    const attachLabel = page.locator('label:has-text("Attach:")');
    await expect(attachLabel).toBeVisible({ timeout: 15000 });
    await attachLabel.scrollIntoViewIfNeeded();
    await attachLabel.click();

    // Verify checkbox is now checked
    const attachCheckbox = page.locator('label:has-text("Attach:") input[type="checkbox"]');
    await expect(attachCheckbox).toBeChecked();

    // Set session override to 1 so a specific session is always used
    const sessionOverrideInput = page.locator('input[placeholder="Auto"]');
    await expect(sessionOverrideInput).toBeVisible({ timeout: 5000 });
    await sessionOverrideInput.fill('1');

    // Submit (button text differs: "Post WOD" for new, "Update WOD" for edit)
    captureNextDialog(page);
    const submitBtn = hasExistingWod
      ? page.locator('button:has-text("Update WOD")')
      : page.locator('button:has-text("Post WOD")');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Navigate to Home tab to verify Part A display
    await navigateToTab(page, 'Home');
    await page.waitForTimeout(2000);

    // Should see the Part A badge
    await expect(page.locator('text=Part A').first()).toBeVisible({ timeout: 15000 });

    // Should see the exercise name in the Part A section
    await expect(page.locator(`text=${EXERCISE}`).first()).toBeVisible({ timeout: 5000 });

    // Should see sets x reps @ % format (e.g., "5 sets x 5 reps @ 70% of 1RM")
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
    await expect(page.locator('text=Part A').first()).toBeVisible({ timeout: 15000 });

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

    // Wait for the active program card to be visible
    await expect(page.locator('text=ACTIVE').first()).toBeVisible({ timeout: 10000 });

    // Click the card header button to expand it (use button selector to handle multiple programs)
    const programCardBtn = page.locator(`button:has-text("${PROGRAM_NAME}")`).first();
    await programCardBtn.scrollIntoViewIfNeeded();
    await programCardBtn.click();

    // Locate the override input and enter 0 (invalid — must be >= 1)
    const overrideInput = page.locator('input[placeholder="#"]');
    await expect(overrideInput).toBeVisible({ timeout: 5000 });
    await overrideInput.scrollIntoViewIfNeeded();
    await overrideInput.fill('0');

    // Register dialog handler BEFORE click — accepts immediately to prevent click hang
    const getMsg = captureNextDialog(page);

    // Click Override — alert fires and is handled by the once listener
    await page.locator('button:has-text("Override")').click();
    await page.waitForTimeout(500);

    expect(getMsg()).toContain('valid session number');
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

    // Wait for the ACTIVE program card to be visible
    await expect(page.locator('text=ACTIVE').first()).toBeVisible({ timeout: 10000 });

    // Click the Deactivate button directly — it's only rendered for the active card
    const deactivateBtn = page.locator('button:has-text("Deactivate")');

    // The Deactivate button is inside the expanded section — expand the card first.
    // Click the program card header button that contains the program name.
    const programCardBtn = page.locator(`button:has-text("${PROGRAM_NAME}")`).first();
    await programCardBtn.scrollIntoViewIfNeeded();
    await programCardBtn.click();

    // If Deactivate is still not visible, the card was already expanded and the click
    // collapsed it — click again to re-expand.
    const isVisible = await deactivateBtn.isVisible();
    if (!isVisible) {
      await programCardBtn.click();
    }
    await expect(deactivateBtn).toBeVisible({ timeout: 5000 });

    // Register dialog handler before click to avoid click-hang on alert
    captureNextDialog(page);
    await deactivateBtn.click();

    // Verify status is no longer ACTIVE — should be COMPLETED (dialog accepted by handler)
    await expect(page.locator(`text=${PROGRAM_NAME}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=COMPLETED').first()).toBeVisible({ timeout: 10000 });
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
