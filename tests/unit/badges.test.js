import { describe, it, expect } from 'vitest';
import { BADGES, calculateStreakWeeks, checkBadges } from '../../src/lib/badges.js';

// Helper: create a result with a given date string (YYYY-MM-DD)
function makeResult(date, overrides = {}) {
  return { id: Math.random(), date, wodId: null, time: null, ...overrides };
}

// Helper: generate N results spread one per day starting from a date string
function makeResults(count, startDate = '2026-01-01') {
  const results = [];
  const base = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    results.push(makeResult(d.toISOString().split('T')[0]));
  }
  return results;
}

/**
 * Get the source's "current Monday key" — replicating the exact same logic
 * as calculateStreakWeeks uses internally so our test dates will match.
 *
 * The source computes:
 *   let currentMonday = new Date(now.setDate(diff));
 *   currentMonday.setHours(0, 0, 0, 0);
 *   const key = currentMonday.toISOString().split('T')[0];
 *
 * In timezone-offset environments toISOString() may return a different calendar
 * date than the local date.  We replicate identically so our weekMap entries match.
 */
function getSourceCurrentMondayKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(now.setDate(diff));
  currentMonday.setHours(0, 0, 0, 0);
  return currentMonday.toISOString().split('T')[0];
}

/**
 * Get the source's weekMap key for a result whose `date` field maps to the
 * Monday N weeks before the current week.
 *
 * The source maps results via:
 *   const d = new Date(r.date + 'T00:00:00');
 *   const day = d.getDay();
 *   const diff = d.getDate() - day + (day === 0 ? -6 : 1);
 *   const monday = new Date(d.setDate(diff));
 *   const key = monday.toISOString().split('T')[0];
 *
 * We need result dates that, when fed through the above, produce the same key
 * as getSourceCurrentMondayKey() minus N*7 days.
 *
 * Strategy: start from a Date whose toISOString() week-Monday matches, then
 * derive actual date strings by adding days.
 */
function getSourceMondayKeyNWeeksAgo(n) {
  // Work backwards from the source current-monday logic
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(now.setDate(diff));
  currentMonday.setHours(0, 0, 0, 0);
  // Go back N weeks
  currentMonday.setDate(currentMonday.getDate() - 7 * n);
  return currentMonday.toISOString().split('T')[0];
}

/**
 * Given a source Monday key (may be a UTC-shifted date), return 3 result date
 * strings such that when the source processes them via `new Date(date + 'T00:00:00')`
 * and computes their Monday key, the result equals `mondayKey`.
 *
 * We achieve this by finding actual local dates whose ISO-Monday key equals `mondayKey`.
 * We do this by creating dates that, when treated as local midnight, compute back to
 * the desired Monday key.
 *
 * Simpler approach: just use the Monday key date +0, +1, +2 days as local strings,
 * which will map back to that Monday or the next depending on offset.
 * Instead, we find the actual local Monday by trial: try candidate dates until
 * the source's weekMap logic maps them to `mondayKey`.
 */
function resultDatesForSourceWeek(mondayKey, count = 3) {
  // The source Monday key was computed as:
  //   localMondayMidnight.toISOString() → may shift by ±1 day
  // We need dates d such that:
  //   new Date(d + 'T00:00:00') → monday computation → toISOString() === mondayKey
  //
  // Approach: iterate through 7 candidate dates near mondayKey and find which ones
  // map to mondayKey when processed by the source's weekMap logic.
  const candidates = [];
  // Try dates from mondayKey-1 through mondayKey+7
  const base = new Date(mondayKey + 'T00:00:00');
  // Shift by timezone offset to get local midnight
  const tzOffsetMs = base.getTimezoneOffset() * 60 * 1000;

  // Try dates in the local week corresponding to mondayKey
  // We search a ±2 day window around mondayKey and the following 6 days
  for (let offset = -1; offset <= 8; offset++) {
    const candidate = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    const candidateStr = candidate.toISOString().split('T')[0];
    // Simulate source weekMap logic
    const d = new Date(candidateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().split('T')[0];
    if (key === mondayKey) {
      candidates.push(candidateStr);
      if (candidates.length === count) break;
    }
  }
  return candidates;
}

// ─── BADGES constant ──────────────────────────────────────────────────────────

describe('BADGES constant', () => {
  it('has exactly 8 badges', () => {
    expect(BADGES).toHaveLength(8);
  });

  it('each badge has required fields: key, name, description, icon, check', () => {
    BADGES.forEach(badge => {
      expect(badge).toHaveProperty('key');
      expect(badge).toHaveProperty('name');
      expect(badge).toHaveProperty('description');
      expect(badge).toHaveProperty('icon');
      expect(badge).toHaveProperty('check');
      expect(typeof badge.key).toBe('string');
      expect(typeof badge.name).toBe('string');
      expect(typeof badge.description).toBe('string');
      expect(typeof badge.icon).toBe('string');
      expect(typeof badge.check).toBe('function');
    });
  });

  it('contains expected badge keys', () => {
    const keys = BADGES.map(b => b.key);
    expect(keys).toContain('first_blood');
    expect(keys).toContain('week_warrior');
    expect(keys).toContain('century_club');
    expect(keys).toContain('iron_will');
    expect(keys).toContain('benchmark_beast');
    expect(keys).toContain('pr_machine');
    expect(keys).toContain('the_murph');
    expect(keys).toContain('sub7_fran');
  });
});

// ─── calculateStreakWeeks ─────────────────────────────────────────────────────

describe('calculateStreakWeeks', () => {
  it('returns 0 for empty array', () => {
    expect(calculateStreakWeeks([])).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(calculateStreakWeeks(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(calculateStreakWeeks(undefined)).toBe(0);
  });

  it('returns 0 when current week has fewer than 3 workouts', () => {
    const currentMondayKey = getSourceCurrentMondayKey();
    const dates = resultDatesForSourceWeek(currentMondayKey, 2);
    const results = dates.map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(0);
  });

  it('returns 1 for current week with exactly 3 workouts', () => {
    const currentMondayKey = getSourceCurrentMondayKey();
    const dates = resultDatesForSourceWeek(currentMondayKey, 3);
    const results = dates.map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(1);
  });

  it('returns 1 for current week with more than 3 workouts', () => {
    const currentMondayKey = getSourceCurrentMondayKey();
    const dates = resultDatesForSourceWeek(currentMondayKey, 5);
    const results = dates.map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(1);
  });

  it('returns 2 for two consecutive weeks (current + last) with 3+ workouts each', () => {
    const week0Key = getSourceMondayKeyNWeeksAgo(0);
    const week1Key = getSourceMondayKeyNWeeksAgo(1);
    const dates0 = resultDatesForSourceWeek(week0Key, 3);
    const dates1 = resultDatesForSourceWeek(week1Key, 3);
    const results = [...dates0, ...dates1].map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(2);
  });

  it('returns 4 for four consecutive weeks with 3+ workouts each', () => {
    const allDates = [
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(0), 3),
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(1), 3),
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(2), 3),
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(3), 3),
    ];
    const results = allDates.map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(4);
  });

  it('breaks streak if a week in the middle has fewer than 3 workouts', () => {
    // Current week: 3, 1 week ago: 1 (breaks streak), 2 weeks ago: 3
    const allDates = [
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(0), 3),
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(1), 1),
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(2), 3),
    ];
    const results = allDates.map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(1);
  });

  it('returns 0 when only past weeks have 3+ workouts but current week does not', () => {
    const allDates = [
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(1), 3),
      ...resultDatesForSourceWeek(getSourceMondayKeyNWeeksAgo(2), 3),
    ];
    const results = allDates.map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(0);
  });
});

// ─── checkBadges ─────────────────────────────────────────────────────────────

describe('checkBadges', () => {
  it('returns empty array when no conditions met', () => {
    const result = checkBadges([], [], [], 0, []);
    expect(result).toEqual([]);
  });

  it('does not re-award badges that are already in existingBadgeKeys', () => {
    const results = makeResults(1);
    const newBadges = checkBadges(results, [], [], 0, ['first_blood']);
    expect(newBadges).not.toContain('first_blood');
  });

  it('returns newly earned badge keys as an array of strings', () => {
    const results = makeResults(1);
    const newBadges = checkBadges(results, [], [], 0, []);
    expect(Array.isArray(newBadges)).toBe(true);
    newBadges.forEach(key => expect(typeof key).toBe('string'));
  });

  // first_blood
  describe('first_blood badge', () => {
    it('is awarded when there is 1+ result', () => {
      const results = makeResults(1);
      const newBadges = checkBadges(results, [], [], 0, []);
      expect(newBadges).toContain('first_blood');
    });

    it('is not awarded when there are 0 results', () => {
      const newBadges = checkBadges([], [], [], 0, []);
      expect(newBadges).not.toContain('first_blood');
    });

    it('is not re-awarded if already earned', () => {
      const results = makeResults(5);
      const newBadges = checkBadges(results, [], [], 0, ['first_blood']);
      expect(newBadges).not.toContain('first_blood');
    });
  });

  // iron_will
  describe('iron_will badge', () => {
    it('is awarded when streakWeeks >= 4', () => {
      const results = makeResults(1);
      const newBadges = checkBadges(results, [], [], 4, []);
      expect(newBadges).toContain('iron_will');
    });

    it('is awarded when streakWeeks > 4', () => {
      const results = makeResults(1);
      const newBadges = checkBadges(results, [], [], 6, []);
      expect(newBadges).toContain('iron_will');
    });

    it('is not awarded when streakWeeks < 4', () => {
      const results = makeResults(1);
      const newBadges = checkBadges(results, [], [], 3, []);
      expect(newBadges).not.toContain('iron_will');
    });

    it('is not awarded when streakWeeks is 0', () => {
      const newBadges = checkBadges([], [], [], 0, []);
      expect(newBadges).not.toContain('iron_will');
    });

    it('is not re-awarded if already earned', () => {
      const results = makeResults(1);
      const newBadges = checkBadges(results, [], [], 4, ['iron_will']);
      expect(newBadges).not.toContain('iron_will');
    });
  });

  // century_club
  describe('century_club badge', () => {
    it('is awarded when there are 100+ results', () => {
      const results = makeResults(100);
      const newBadges = checkBadges(results, [], [], 0, []);
      expect(newBadges).toContain('century_club');
    });

    it('is awarded when there are more than 100 results', () => {
      const results = makeResults(150);
      const newBadges = checkBadges(results, [], [], 0, []);
      expect(newBadges).toContain('century_club');
    });

    it('is not awarded when there are fewer than 100 results', () => {
      const results = makeResults(99);
      const newBadges = checkBadges(results, [], [], 0, []);
      expect(newBadges).not.toContain('century_club');
    });

    it('is not re-awarded if already earned', () => {
      const results = makeResults(100);
      const newBadges = checkBadges(results, [], [], 0, ['century_club']);
      expect(newBadges).not.toContain('century_club');
    });
  });

  // pr_machine
  describe('pr_machine badge', () => {
    it('is awarded when there are 5+ benchmark PRs', () => {
      const prs = ['Fran', 'Cindy', 'Helen', 'Grace', 'Diane'];
      const newBadges = checkBadges([], [], prs, 0, []);
      expect(newBadges).toContain('pr_machine');
    });

    it('is awarded when there are more than 5 benchmark PRs', () => {
      const prs = ['Fran', 'Cindy', 'Helen', 'Grace', 'Diane', 'Annie'];
      const newBadges = checkBadges([], [], prs, 0, []);
      expect(newBadges).toContain('pr_machine');
    });

    it('is not awarded when there are fewer than 5 benchmark PRs', () => {
      const prs = ['Fran', 'Cindy', 'Helen', 'Grace'];
      const newBadges = checkBadges([], [], prs, 0, []);
      expect(newBadges).not.toContain('pr_machine');
    });

    it('is not awarded with 0 benchmark PRs', () => {
      const newBadges = checkBadges([], [], [], 0, []);
      expect(newBadges).not.toContain('pr_machine');
    });

    it('is not re-awarded if already earned', () => {
      const prs = ['Fran', 'Cindy', 'Helen', 'Grace', 'Diane'];
      const newBadges = checkBadges([], [], prs, 0, ['pr_machine']);
      expect(newBadges).not.toContain('pr_machine');
    });
  });

  // Multiple badges at once
  describe('multiple badges', () => {
    it('can award multiple badges in a single call', () => {
      const results = makeResults(100);
      const prs = ['Fran', 'Cindy', 'Helen', 'Grace', 'Diane'];
      const newBadges = checkBadges(results, [], prs, 4, []);
      expect(newBadges).toContain('first_blood');
      expect(newBadges).toContain('century_club');
      expect(newBadges).toContain('pr_machine');
      expect(newBadges).toContain('iron_will');
    });

    it('only returns newly earned badges, not already-existing ones', () => {
      const results = makeResults(100);
      const prs = ['Fran', 'Cindy', 'Helen', 'Grace', 'Diane'];
      const existing = ['first_blood', 'century_club'];
      const newBadges = checkBadges(results, [], prs, 4, existing);
      expect(newBadges).not.toContain('first_blood');
      expect(newBadges).not.toContain('century_club');
      expect(newBadges).toContain('pr_machine');
      expect(newBadges).toContain('iron_will');
    });
  });
});
