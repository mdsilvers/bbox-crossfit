import React, { useState, useMemo } from 'react';
import { TrendingUp, Trophy, Flame, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  format, parseISO, startOfDay, subWeeks, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, differenceInCalendarDays, isWithinInterval
} from 'date-fns';
import {
  getScoreCategory, isLowerBetter, parseTimeToSeconds, amrapToNumeric,
  formatScore, compareScores, secondsToTimeStr
} from '../lib/score-utils';
import { isBenchmarkWod, getBenchmarkByName } from '../lib/benchmarks';

import WeeklySummary from './WeeklySummary';
import BenchmarkHistory from './BenchmarkHistory';
import PercentileRank from './PercentileRank';
import BodyComposition from './BodyComposition';

// Chart colors for benchmark lines
const CHART_COLORS = ['#c95f5f', '#5a8ac9', '#5fa877', '#d4ba6a', '#9a73b5', '#cf8a52', '#72b88a', '#b54e4e'];

// ====== PR Trend Chart ======
function PRTrendChart({ workoutResults, allWODs, onBenchmarkClick }) {
  const { chartData, benchmarkNames } = useMemo(() => {
    const wodNameMap = {};
    (allWODs || []).forEach(wod => {
      if (wod.name) wodNameMap[wod.id] = wod.name;
    });

    // Group results by benchmark name
    const benchmarkGroups = {};
    (workoutResults || []).forEach(result => {
      const wodName = result.customWodName || wodNameMap[result.wodId];
      if (!wodName || !isBenchmarkWod(wodName)) return;
      const bm = getBenchmarkByName(wodName);
      if (!bm) return;
      if (!benchmarkGroups[bm.name]) benchmarkGroups[bm.name] = { type: bm.type, results: [] };
      benchmarkGroups[bm.name].results.push(result);
    });

    // Only show benchmarks with ≥2 attempts
    const names = Object.keys(benchmarkGroups).filter(
      name => benchmarkGroups[name].results.length >= 2
    );

    if (names.length === 0) return { chartData: [], benchmarkNames: [] };

    // Build unified timeline
    const allDates = new Set();
    names.forEach(name => {
      benchmarkGroups[name].results.forEach(r => allDates.add(r.date));
    });
    const sortedDates = [...allDates].sort();

    // Normalize scores for each benchmark
    const toNormalized = (time, type) => {
      const cat = getScoreCategory(type);
      if (cat === 'time') {
        const secs = parseTimeToSeconds(time);
        // Invert so lower time = higher value on chart
        return secs != null ? -secs : null;
      }
      if (cat === 'amrap') return amrapToNumeric(time);
      return parseFloat(time) || null;
    };

    const data = sortedDates.map(date => {
      const point = { date, dateLabel: format(parseISO(date), 'MMM d') };
      names.forEach(name => {
        const r = benchmarkGroups[name].results.find(r => r.date === date);
        if (r?.time) {
          point[name] = toNormalized(r.time, benchmarkGroups[name].type);
        }
      });
      return point;
    });

    return { chartData: data, benchmarkNames: names };
  }, [workoutResults, allWODs]);

  if (benchmarkNames.length === 0) return null;

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">PR Trends</h3>
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="dateLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '8px' }}
              labelStyle={{ color: '#f0f1f3' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#a0a5ae' }}
              onClick={(e) => onBenchmarkClick?.(e.value)}
              formatter={(value) => <span style={{ color: '#c0c3c9', cursor: 'pointer' }}>{value}</span>}
            />
            {benchmarkNames.map((name, idx) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ====== Workout Heatmap ======
function WorkoutHeatmap({ workoutResults }) {
  const { weeks, maxWorkouts } = useMemo(() => {
    const now = new Date();
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11);
    const end = now;

    const days = eachDayOfInterval({ start, end });

    // Count workouts per day
    const dateCounts = {};
    (workoutResults || []).forEach(r => {
      const d = r.date;
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    let maxW = 0;
    const weekMap = [];
    let currentWeek = [];

    days.forEach((day, idx) => {
      const dayOfWeek = day.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = dateCounts[dateStr] || 0;
      if (count > maxW) maxW = count;

      if (adjustedDay === 0 && currentWeek.length > 0) {
        weekMap.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ date: day, dateStr, count, dayOfWeek: adjustedDay });
    });
    if (currentWeek.length > 0) weekMap.push(currentWeek);

    return { weeks: weekMap, maxWorkouts: maxW };
  }, [workoutResults]);

  const getColor = (count) => {
    if (count === 0) return 'bg-slate-700/50';
    if (maxWorkouts <= 1) return 'bg-green-500';
    const intensity = count / maxWorkouts;
    if (intensity > 0.66) return 'bg-green-500';
    if (intensity > 0.33) return 'bg-green-600/70';
    return 'bg-green-700/50';
  };

  const dayLabels = ['M', '', 'W', '', 'F', '', 'S'];

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Activity</h3>
        <span className="text-slate-500 text-xs">Last 12 weeks</span>
      </div>
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-slate-500" style={{ fontSize: '8px' }}>
              {label}
            </div>
          ))}
        </div>
        {/* Heatmap grid */}
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, di) => {
                const day = week.find(d => d.dayOfWeek === di);
                if (!day) return <div key={di} className="w-3 h-3" />;
                return (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                    title={`${format(day.date, 'MMM d')}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-slate-500 text-xs mr-1">Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-700/50" />
        <div className="w-3 h-3 rounded-sm bg-green-700/50" />
        <div className="w-3 h-3 rounded-sm bg-green-600/70" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <span className="text-slate-500 text-xs ml-1">More</span>
      </div>
    </div>
  );
}

// ====== Stat Cards ======
function StatCards({ workoutResults, allWODs }) {
  const stats = useMemo(() => {
    if (!workoutResults || workoutResults.length === 0) {
      return { totalWorkouts: 0, currentStreak: 0, prsThisMonth: 0, mostImproved: null };
    }

    const totalWorkouts = workoutResults.length;

    // Current streak (consecutive days with workouts, counting back from today)
    const today = startOfDay(new Date());
    const sortedDates = [...new Set(workoutResults.map(r => r.date))].sort().reverse();
    let streak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      const d = startOfDay(parseISO(sortedDates[i]));
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (isSameDay(d, startOfDay(expected))) {
        streak++;
      } else if (i === 0 && differenceInCalendarDays(today, d) === 1) {
        // Allow starting from yesterday
        streak++;
        // Adjust expected for subsequent days
        const adjustedToday = d;
        for (let j = i + 1; j < sortedDates.length; j++) {
          const dj = startOfDay(parseISO(sortedDates[j]));
          const exp = new Date(adjustedToday);
          exp.setDate(exp.getDate() - (j - i));
          if (isSameDay(dj, startOfDay(exp))) {
            streak++;
          } else {
            break;
          }
        }
        break;
      } else {
        break;
      }
    }

    // PRs this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const wodNameMap = {};
    (allWODs || []).forEach(wod => {
      if (wod.name) wodNameMap[wod.id] = wod.name;
    });

    const benchmarkGroups = {};
    workoutResults.forEach(result => {
      const wodName = result.customWodName || wodNameMap[result.wodId];
      if (!wodName || !isBenchmarkWod(wodName)) return;
      const bm = getBenchmarkByName(wodName);
      if (!bm) return;
      if (!benchmarkGroups[bm.name]) benchmarkGroups[bm.name] = { type: bm.type, results: [] };
      benchmarkGroups[bm.name].results.push(result);
    });

    let prsThisMonth = 0;
    let mostImproved = null;
    let bestImprovementPct = 0;

    Object.entries(benchmarkGroups).forEach(([name, { type, results }]) => {
      const sorted = [...results].sort((a, b) => new Date(a.date) - new Date(b.date));
      let best = sorted[0];

      const toNumeric = (time) => {
        const cat = getScoreCategory(type);
        if (cat === 'time') return parseTimeToSeconds(time);
        if (cat === 'amrap') return amrapToNumeric(time);
        return parseFloat(time) || null;
      };

      const firstNum = toNumeric(sorted[0]?.time);

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].time && best.time && compareScores(sorted[i].time, best.time, type) < 0) {
          best = sorted[i];
          const d = parseISO(sorted[i].date);
          try {
            if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
              prsThisMonth++;
            }
          } catch {}
        }
      }

      // Most improved calculation
      if (sorted.length >= 2 && firstNum) {
        const bestNum = toNumeric(best.time);
        if (bestNum != null) {
          const lowerBetter = isLowerBetter(type);
          const pct = lowerBetter
            ? ((firstNum - bestNum) / firstNum) * 100
            : ((bestNum - firstNum) / firstNum) * 100;
          if (pct > bestImprovementPct) {
            bestImprovementPct = pct;
            mostImproved = { name, pct };
          }
        }
      }
    });

    // Count first attempts this month as PRs too
    Object.entries(benchmarkGroups).forEach(([name, { results }]) => {
      if (results.length === 1) {
        const d = parseISO(results[0].date);
        try {
          if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
            prsThisMonth++;
          }
        } catch {}
      }
    });

    return { totalWorkouts, currentStreak: streak, prsThisMonth, mostImproved };
  }, [workoutResults, allWODs]);

  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Workouts</div>
        <div className="text-3xl font-bold text-white">{stats.totalWorkouts}</div>
      </div>
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Current Streak</div>
        <div className="text-3xl font-bold text-orange-400 flex items-center gap-1">
          {stats.currentStreak}
          {stats.currentStreak > 0 && <span className="text-lg">🔥</span>}
        </div>
        <div className="text-slate-500 text-xs">consecutive days</div>
      </div>
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">PRs This Month</div>
        <div className="text-3xl font-bold text-yellow-400">{stats.prsThisMonth}</div>
      </div>
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Most Improved</div>
        {stats.mostImproved ? (
          <>
            <div className="text-green-400 font-bold text-sm">{stats.mostImproved.name}</div>
            <div className="text-green-400 text-lg font-bold">↑ {stats.mostImproved.pct.toFixed(1)}%</div>
          </>
        ) : (
          <div className="text-slate-600 text-lg font-bold">—</div>
        )}
      </div>
    </div>
  );
}

// ====== Recent PRs ======
function RecentPRs({ workoutResults, allWODs, onBenchmarkClick }) {
  const prs = useMemo(() => {
    const wodNameMap = {};
    (allWODs || []).forEach(wod => {
      if (wod.name) wodNameMap[wod.id] = wod.name;
    });

    const benchmarkGroups = {};
    (workoutResults || []).forEach(result => {
      const wodName = result.customWodName || wodNameMap[result.wodId];
      if (!wodName || !isBenchmarkWod(wodName)) return;
      const bm = getBenchmarkByName(wodName);
      if (!bm) return;
      if (!benchmarkGroups[bm.name]) benchmarkGroups[bm.name] = { type: bm.type, results: [] };
      benchmarkGroups[bm.name].results.push(result);
    });

    const prList = [];

    Object.entries(benchmarkGroups).forEach(([name, { type, results }]) => {
      const sorted = [...results].sort((a, b) => new Date(a.date) - new Date(b.date));
      let best = sorted[0];
      let prevBest = null;

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].time && best.time && compareScores(sorted[i].time, best.time, type) < 0) {
          prevBest = best;
          best = sorted[i];
        }
      }

      let improvementPct = null;
      if (prevBest?.time && best?.time) {
        const cat = getScoreCategory(type);
        const lowerBetter = isLowerBetter(type);
        const toNum = (t) => {
          if (cat === 'time') return parseTimeToSeconds(t);
          if (cat === 'amrap') return amrapToNumeric(t);
          return parseFloat(t) || null;
        };
        const prevNum = toNum(prevBest.time);
        const bestNum = toNum(best.time);
        if (prevNum != null && bestNum != null && prevNum !== 0) {
          improvementPct = lowerBetter
            ? ((prevNum - bestNum) / prevNum) * 100
            : ((bestNum - prevNum) / prevNum) * 100;
        }
      }

      prList.push({
        name,
        type,
        bestScore: formatScore(best.time, type),
        date: best.date,
        attempts: results.length,
        improvementPct,
      });
    });

    return prList.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  }, [workoutResults, allWODs]);

  if (prs.length === 0) return null;

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Recent PRs</h3>
      </div>
      <div className="space-y-2">
        {prs.map(pr => (
          <button
            key={pr.name}
            onClick={() => onBenchmarkClick?.(pr.name)}
            className="w-full text-left bg-slate-700/50 rounded-xl p-3 flex items-center justify-between hover:bg-slate-700/70 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{pr.name}</span>
                <span className="bg-yellow-600/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded">
                  {pr.type}
                </span>
              </div>
              <div className="text-slate-400 text-xs mt-0.5">
                {pr.attempts} attempt{pr.attempts !== 1 ? 's' : ''} • {format(parseISO(pr.date), 'MMM d')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-bold">{pr.bestScore}</div>
              {pr.improvementPct != null && pr.improvementPct > 0 && (
                <div className="text-green-400 text-xs font-semibold">↑ {pr.improvementPct.toFixed(1)}%</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ====== Top Movements ======
function TopMovements({ workoutResults }) {
  const topMovements = useMemo(() => {
    const movementCounts = {};
    (workoutResults || []).forEach(result => {
      result.movements.forEach(movement => {
        if (movement.name) {
          movementCounts[movement.name] = (movementCounts[movement.name] || 0) + 1;
        }
      });
    });
    return Object.entries(movementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [workoutResults]);

  if (topMovements.length === 0) return null;

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Most Common Movements</h3>
      </div>
      <div className="space-y-2">
        {topMovements.map(([movement, count], idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                {idx + 1}
              </div>
              <span className="text-white font-medium text-sm">{movement}</span>
            </div>
            <span className="text-slate-400 text-sm font-medium">{count}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====== Main Progress Dashboard ======
export default function ProgressDashboard({ currentUser, workoutResults, allAthleteResults, allWODs }) {
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);

  const handleBenchmarkClick = (name) => {
    setSelectedBenchmark(name);
  };

  const handleBack = () => {
    setSelectedBenchmark(null);
  };

  // If viewing a specific benchmark history
  if (selectedBenchmark) {
    return (
      <BenchmarkHistory
        benchmarkName={selectedBenchmark}
        results={workoutResults}
        allWODs={allWODs}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="space-y-0">
      {/* Weekly Summary at top */}
      <WeeklySummary workoutResults={workoutResults} allWODs={allWODs} />

      {/* Stat Cards */}
      <StatCards workoutResults={workoutResults} allWODs={allWODs} />

      {/* PR Trend Chart */}
      <PRTrendChart
        workoutResults={workoutResults}
        allWODs={allWODs}
        onBenchmarkClick={handleBenchmarkClick}
      />

      {/* Workout Heatmap */}
      <WorkoutHeatmap workoutResults={workoutResults} />

      {/* Percentile Rankings */}
      <PercentileRank
        currentUser={currentUser}
        workoutResults={workoutResults}
        allWODs={allWODs}
        onBenchmarkClick={handleBenchmarkClick}
      />

      {/* Recent PRs */}
      <RecentPRs
        workoutResults={workoutResults}
        allWODs={allWODs}
        onBenchmarkClick={handleBenchmarkClick}
      />

      {/* Top Movements */}
      <TopMovements workoutResults={workoutResults} />

      {/* Body Composition */}
      <BodyComposition currentUser={currentUser} />
    </div>
  );
}
