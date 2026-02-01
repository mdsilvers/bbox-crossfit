import { isBenchmarkWod } from './benchmarks';

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
        const key = weekStart.toISOString().split('T')[0];
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
        const parts = r.time.split(':').map(Number);
        if (parts.length === 2) {
          const totalSeconds = parts[0] * 60 + parts[1];
          return totalSeconds < 420; // 7 * 60
        }
        return false;
      });
    },
  },
];

/**
 * Calculate streak weeks: consecutive weeks with 3+ workouts,
 * walking backwards from current week.
 */
export function calculateStreakWeeks(results) {
  if (!results || results.length === 0) return 0;

  // Group results by ISO week (Mon-Sun)
  const weekMap = {};
  results.forEach(r => {
    const d = new Date(r.date + 'T00:00:00');
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().split('T')[0];
    weekMap[key] = (weekMap[key] || 0) + 1;
  });

  // Walk backwards from current week
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  let currentMonday = new Date(now.setDate(diff));
  currentMonday.setHours(0, 0, 0, 0);

  let streak = 0;

  while (true) {
    const key = currentMonday.toISOString().split('T')[0];
    const count = weekMap[key] || 0;
    if (count >= 3) {
      streak++;
      // Go to previous Monday
      currentMonday.setDate(currentMonday.getDate() - 7);
    } else {
      break;
    }
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
