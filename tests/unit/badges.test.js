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

// Format a Date as YYYY-MM-DD in local time — matches the source's week keys
function toLocalKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Local-midnight Monday of the week N weeks before the current one
function mondayNWeeksAgo(n) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1) - 7 * n);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// `count` result date strings (Mon, Tue, …) inside the week N weeks ago. Keep
// count <= 7 so the dates stay within a single Mon-Sun week.
function resultDatesForWeek(weeksAgo, count = 3) {
  const monday = mondayNWeeksAgo(weeksAgo);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toLocalKey(d);
  });
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

  it('returns 0 when current week has fewer than 3 workouts and no prior weeks', () => {
    const results = resultDatesForWeek(0, 2).map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(0);
  });

  it('returns 1 for current week with exactly 3 workouts', () => {
    const results = resultDatesForWeek(0, 3).map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(1);
  });

  it('returns 1 for current week with more than 3 workouts', () => {
    const results = resultDatesForWeek(0, 5).map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(1);
  });

  it('returns 2 for two consecutive weeks (current + last) with 3+ workouts each', () => {
    const results = [
      ...resultDatesForWeek(0, 3),
      ...resultDatesForWeek(1, 3),
    ].map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(2);
  });

  it('returns 4 for four consecutive weeks with 3+ workouts each', () => {
    const results = [
      ...resultDatesForWeek(0, 3),
      ...resultDatesForWeek(1, 3),
      ...resultDatesForWeek(2, 3),
      ...resultDatesForWeek(3, 3),
    ].map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(4);
  });

  it('breaks streak if a completed week has fewer than 3 workouts', () => {
    // Current week: 3, 1 week ago: 1 (breaks streak), 2 weeks ago: 3
    const results = [
      ...resultDatesForWeek(0, 3),
      ...resultDatesForWeek(1, 1),
      ...resultDatesForWeek(2, 3),
    ].map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(1);
  });

  it('keeps the streak from completed weeks while the current week is still in progress', () => {
    // The in-progress week must not zero the streak (it used to reset every
    // Monday morning) — completed consecutive weeks still count
    const results = [
      ...resultDatesForWeek(1, 3),
      ...resultDatesForWeek(2, 3),
    ].map(d => makeResult(d));
    expect(calculateStreakWeeks(results)).toBe(2);
  });

  it('returns 0 when the last completed week broke the streak', () => {
    // 1 week ago: 0 workouts (gap), 2 weeks ago: 3 — gap kills the streak
    const results = resultDatesForWeek(2, 3).map(d => makeResult(d));
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
