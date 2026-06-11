import { isBenchmarkWod } from './benchmarks';
import { parseTimeToSeconds } from './score-utils';

// Format a Date as YYYY-MM-DD using local time. toISOString() converts to UTC,
// which shifts the calendar day for any non-UTC timezone and mis-buckets weeks.
function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Monday (local midnight) of the week containing d. Does not mutate d.
function mondayOf(d) {
  const monday = new Date(d);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Badge definitions
export const BADGES = [
  {
    key: 'first_blood',
    name: 'First Blood',
    description: 'Log your first workout',
    icon: 'Zap',
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    check: (results) => results.length >= 1,
  },
  {
    key: 'week_warrior',
    name: 'Week Warrior',
    description: '5 workouts in one week',
    icon: 'Sword',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    check: (results) => {
      const weekMap = {};
      results.forEach(r => {
        const d = new Date(r.date + 'T00:00:00');
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = toLocalDateKey(weekStart);
        weekMap[key] = (weekMap[key] || 0) + 1;
      });
      return Object.values(weekMap).some(count => count >= 5);
    },
  },
  {
    key: 'century_club',
    name: 'Century Club',
    description: '100 total workouts',
    icon: 'Award',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600/20',
    check: (results) => results.length >= 100,
  },
  {
    key: 'iron_will',
    name: 'Iron Will',
    description: '4-week consecutive streak (3+/week)',
    icon: 'Shield',
    color: 'text-red-400',
    bgColor: 'bg-red-600/20',
    check: (results, allWODs, benchmarkPRs, streakWeeks) => streakWeeks >= 4,
  },
  {
    key: 'benchmark_beast',
    name: 'Benchmark Beast',
    description: 'Complete 10 different benchmarks',
    icon: 'Target',
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/20',
    check: (results, allWODs) => {
      const benchmarkNames = new Set();
      results.forEach(r => {
        const wod = allWODs.find(w => w.id === r.wodId);
        if (wod?.name && isBenchmarkWod(wod.name)) {
          benchmarkNames.add(wod.name.toLowerCase());
        }
      });
      return benchmarkNames.size >= 10;
    },
  },
  {
    key: 'pr_machine',
    name: 'PR Machine',
    description: '5 benchmark personal records',
    icon: 'TrendingUp',
    color: 'text-orange-400',
    bgColor: 'bg-orange-600/20',
    check: (results, allWODs, benchmarkPRs) => benchmarkPRs.length >= 5,
  },
  {
    key: 'the_murph',
    name: 'The Murph',
    description: 'Complete Murph',
    icon: 'Flag',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-600/20',
    check: (results, allWODs) => {
      return results.some(r => {
        const wod = allWODs.find(w => w.id === r.wodId);
        return wod?.name?.toLowerCase() === 'murph';
      });
    },
  },
  {
    key: 'sub7_fran',
    name: 'Sub-7 Fran',
    description: 'Fran under 7:00',
    icon: 'Timer',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-600/20',
    check: (results, allWODs) => {
      return results.some(r => {
        const wod = allWODs.find(w => w.id === r.wodId);
        if (wod?.name?.toLowerCase() !== 'fran' || !r.time) return false;
        const totalSeconds = parseTimeToSeconds(r.time);
        return totalSeconds != null && totalSeconds < 420; // 7 * 60
      });
    },
  },
];

/**
 * Calculate streak weeks: consecutive weeks (Mon-Sun) with 3+ workouts,
 * walking backwards from the current week. The current week counts once it
 * reaches 3 workouts, but an in-progress week with fewer than 3 does not
 * break the streak — otherwise every streak would reset to 0 each Monday.
 */
export function calculateStreakWeeks(results) {
  if (!results || results.length === 0) return 0;

  const weekMap = {};
  results.forEach(r => {
    const key = toLocalDateKey(mondayOf(new Date(r.date + 'T00:00:00')));
    weekMap[key] = (weekMap[key] || 0) + 1;
  });

  const walker = mondayOf(new Date());
  let streak = 0;

  if ((weekMap[toLocalDateKey(walker)] || 0) >= 3) {
    streak++;
  }

  // Completed weeks must qualify consecutively
  walker.setDate(walker.getDate() - 7);
  while ((weekMap[toLocalDateKey(walker)] || 0) >= 3) {
    streak++;
    walker.setDate(walker.getDate() - 7);
  }

  return streak;
}

/**
 * Check all badges and return newly earned badge keys.
 */
export function checkBadges(results, allWODs, benchmarkPRs, streakWeeks, existingBadgeKeys) {
  const existing = new Set(existingBadgeKeys);
  const newBadges = [];

  BADGES.forEach(badge => {
    if (existing.has(badge.key)) return;
    try {
      if (badge.check(results, allWODs, benchmarkPRs, streakWeeks)) {
        newBadges.push(badge.key);
      }
    } catch {
      // Skip badge if check fails
    }
  });

  return newBadges;
}
