import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Trophy, Dumbbell, Flame, Calendar } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO, differenceInWeeks, isBefore } from 'date-fns';
import { getScoreCategory, compareScores } from '../lib/score-utils';
import { isBenchmarkWod, getBenchmarkByName } from '../lib/benchmarks';

export default function WeeklySummary({ workoutResults, allWODs }) {
  const summary = useMemo(() => {
    if (!workoutResults || workoutResults.length === 0) {
      return {
        thisWeekCount: 0,
        lastWeekCount: 0,
        prsThisWeek: 0,
        prsLastWeek: 0,
        totalVolume: 0,
        lastWeekVolume: 0,
        weeklyStreak: 0,
      };
    }

    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const thisWeekInterval = { start: thisWeekStart, end: thisWeekEnd };
    const lastWeekInterval = { start: lastWeekStart, end: lastWeekEnd };

    // Workouts this week / last week
    const thisWeekResults = workoutResults.filter(r => {
      try { return isWithinInterval(parseISO(r.date), thisWeekInterval); } catch { return false; }
    });
    const lastWeekResults = workoutResults.filter(r => {
      try { return isWithinInterval(parseISO(r.date), lastWeekInterval); } catch { return false; }
    });

    // Build WOD name map
    const wodNameMap = {};
    (allWODs || []).forEach(wod => {
      if (wod.name) wodNameMap[wod.id] = wod.name;
    });

    // PRs this week: check if any benchmark result this week is a new best
    const benchmarkGroups = {};
    workoutResults.forEach(result => {
      const wodName = result.customWodName || wodNameMap[result.wodId];
      if (!wodName || !isBenchmarkWod(wodName)) return;
      const bm = getBenchmarkByName(wodName);
      if (!bm) return;
      if (!benchmarkGroups[bm.name]) benchmarkGroups[bm.name] = [];
      benchmarkGroups[bm.name].push(result);
    });

    let prsThisWeek = 0;
    let prsLastWeek = 0;
    Object.entries(benchmarkGroups).forEach(([name, attempts]) => {
      if (attempts.length < 2) {
        // First attempt counts as a PR if it's this week
        if (attempts.length === 1) {
          const d = parseISO(attempts[0].date);
          try {
            if (isWithinInterval(d, thisWeekInterval)) prsThisWeek++;
            if (isWithinInterval(d, lastWeekInterval)) prsLastWeek++;
          } catch {}
        }
        return;
      }
      const bm = getBenchmarkByName(name);
      const type = bm?.type || 'For Time';
      const sorted = [...attempts].sort((a, b) => new Date(a.date) - new Date(b.date));
      let best = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        if (curr.time && best.time && compareScores(curr.time, best.time, type) < 0) {
          best = curr;
          const d = parseISO(curr.date);
          try {
            if (isWithinInterval(d, thisWeekInterval)) prsThisWeek++;
            if (isWithinInterval(d, lastWeekInterval)) prsLastWeek++;
          } catch {}
        }
      }
    });

    // Total volume (weight × reps for strength-type movements)
    const calcVolume = (results) => {
      let vol = 0;
      results.forEach(r => {
        (r.movements || []).forEach(m => {
          const weight = parseFloat(m.weight);
          if (!isNaN(weight) && weight > 0) {
            const repsStr = String(m.reps || '1');
            const reps = parseInt(repsStr, 10) || 1;
            vol += weight * reps;
          }
        });
      });
      return vol;
    };
    const totalVolume = calcVolume(thisWeekResults);
    const lastWeekVolume = calcVolume(lastWeekResults);

    // Weekly streak: consecutive weeks with ≥3 workouts going backwards
    let weeklyStreak = 0;
    const sortedByDate = [...workoutResults].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortedByDate.length > 0) {
      // Check this week first
      if (thisWeekResults.length >= 3) weeklyStreak = 1;
      // Then check previous weeks
      for (let w = 1; w <= 52; w++) {
        const wStart = startOfWeek(subWeeks(now, w), { weekStartsOn: 1 });
        const wEnd = endOfWeek(subWeeks(now, w), { weekStartsOn: 1 });
        const count = workoutResults.filter(r => {
          try { return isWithinInterval(parseISO(r.date), { start: wStart, end: wEnd }); } catch { return false; }
        }).length;
        if (count >= 3) {
          weeklyStreak++;
        } else {
          break;
        }
      }
    }

    return {
      thisWeekCount: thisWeekResults.length,
      lastWeekCount: lastWeekResults.length,
      prsThisWeek,
      prsLastWeek,
      totalVolume,
      lastWeekVolume,
      weeklyStreak,
    };
  }, [workoutResults, allWODs]);

  const ComparisonArrow = ({ current, previous }) => {
    if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
    if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  };

  const formatVolume = (vol) => {
    if (vol >= 10000) return `${(vol / 1000).toFixed(1)}k`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
    return String(Math.round(vol));
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">This Week</h3>
        {summary.weeklyStreak > 0 && (
          <span className="bg-orange-600/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-semibold">
            🔥 {summary.weeklyStreak}w streak
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Workouts</span>
            <ComparisonArrow current={summary.thisWeekCount} previous={summary.lastWeekCount} />
          </div>
          <div className="text-2xl font-bold text-white">{summary.thisWeekCount}</div>
          <div className="text-slate-500 text-xs">vs {summary.lastWeekCount} last week</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">PRs</span>
            <ComparisonArrow current={summary.prsThisWeek} previous={summary.prsLastWeek} />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{summary.prsThisWeek}</div>
          <div className="text-slate-500 text-xs">vs {summary.prsLastWeek} last week</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Volume (lbs)</span>
            <ComparisonArrow current={summary.totalVolume} previous={summary.lastWeekVolume} />
          </div>
          <div className="text-2xl font-bold text-white">{formatVolume(summary.totalVolume)}</div>
          <div className="text-slate-500 text-xs">vs {formatVolume(summary.lastWeekVolume)} last week</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Weekly Streak</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400">{summary.weeklyStreak}</div>
          <div className="text-slate-500 text-xs">weeks with 3+ WODs</div>
        </div>
      </div>
    </div>
  );
}
