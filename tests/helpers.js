/**
 * Log in as a test user via the UI.
 * Waits for the dashboard to appear before returning.
 */
export async function login(page, role = 'coach') {
  const email = role === 'coach'
    ? (process.env.TEST_COACH_EMAIL || 'testcoach@bbox.test')
    : (process.env.TEST_ATHLETE_EMAIL || 'testathlete@bbox.test');
  const password = role === 'coach'
    ? (process.env.TEST_COACH_PASSWORD || 'TestCoach123!')
    : (process.env.TEST_ATHLETE_PASSWORD || 'TestAthlete123!');

  await page.goto('/');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Login")');

  // Wait for dashboard to load (bottom nav appears)
  await page.waitForSelector('button:has-text("Home")', { timeout: 15000 });
}

/**
 * Log out via the logout button in the header.
 */
export async function logout(page) {
  await page.click('[data-testid="logout-button"]');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
}

/**
 * Navigate to a specific tab in the bottom nav.
 */
export async function navigateToTab(page, tab) {
  await page.click(`button:has-text("${tab}")`);
  await page.waitForTimeout(500);
}

/**
 * Get today's date as YYYY-MM-DD (matches app's getLocalToday).
 */
export function getLocalToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Wait for network-idle state.
 */
export async function waitForDataLoad(page) {
  await page.waitForLoadState('networkidle');
}
