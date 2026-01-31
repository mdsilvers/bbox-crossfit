import React, { useState, useEffect, useMemo } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { getScoreCategory, isLowerBetter, parseTimeToSeconds, amrapToNumeric, formatScore, compareScores } from '../lib/score-utils';
import { isBenchmarkWod, getBenchmarkByName } from '../lib/benchmarks';
import * as db from '../lib/database';

export default function PercentileRank({ currentUser, workoutResults, allWODs, onBenchmarkClick }) {
  const [expanded, setExpanded] = useState(false);
  const [allBenchmarkResults, setAllBenchmarkResults] = useState({});
  const [loading, setLoading] = useState(false);

  // Identify benchmarks the user has done
  const userBenchmarks = useMemo(() => {
    const wodNameMap = {};
    (allWODs || []).forEach(wod => {
      if (wod.name) wodNameMap[wod.id] = wod.name;
    });

    const benchmarks = {};
    (workoutResults || []).forEach(result => {
      const wodName = result.customWodName || wodNameMap[result.wodId];
      if (!wodName || !isBenchmarkWod(wodName)) return;
      const bm = getBenchmarkByName(wodName);
      if (!bm) return;
      if (!benchmarks[bm.name]) {
        benchmarks[bm.name] = { type: bm.type, best: result, wodIds: new Set() };
      }
      if (result.wodId) benchmarks[bm.name].wodIds.add(result.wodId);
      // Track best result
      if (result.time && benchmarks[bm.name].best.time &&
          compareScores(result.time, benchmarks[bm.name].best.time, bm.type) < 0) {
        benchmarks[bm.name].best = result;
      }
    });

    return benchmarks;
  }, [workoutResults, allWODs]);

  // Load all athletes' results for benchmarks
  useEffect(() => {
    const loadBenchmarkResults = async () => {
      const bmNames = Object.keys(userBenchmarks);
      if (bmNames.length === 0) return;

      setLoading(true);
      try {
        const results = {};
        for (const name of bmNames) {
          const wodIds = Array.from(userBenchmarks[name].wodIds);
          if (wodIds.length === 0) continue;
          try {
            const data = await db.getAllResultsForBenchmark(wodIds);
            results[name] = data.map(r => db.resultToAppFormat(r));
          } catch (err) {
            console.log(`Error loading benchmark results for ${name}:`, err);
            results[name] = [];
          }
        }
        setAllBenchmarkResults(results);
      } catch (err) {
        console.log('Error loading benchmark results:', err);
      }
      setLoading(false);
    };

    loadBenchmarkResults();
  }, [userBenchmarks]);

  // Calculate percentiles
  const rankings = useMemo(() => {
    const ranks = [];

    Object.entries(userBenchmarks).forEach(([name, { type, best }]) => {
      const allResults = allBenchmarkResults[name];
      if (!allResults || allResults.length < 2) return;

      const category = getScoreCategory(type);
      const lowerBetter = isLowerBetter(type);

      // Get best score per athlete
      const athleteBests = {};
      allResults.forEach(r => {
        if (!r.time || !r.athleteId) return;
        if (!athleteBests[r.athleteId] ||
            compareScores(r.time, athleteBests[r.athleteId].time, type) < 0) {
          athleteBests[r.athleteId] = r;
        }
      });

      const scores = Object.values(athleteBests);
      if (scores.length < 2) return;

      // Count how many athletes the user beats
      const userBestTime = best.time;
      if (!userBestTime) return;

      let beaten = 0;
      scores.forEach(s => {
        if (s.athleteId === currentUser?.id) return;
        if (s.time && compareScores(userBestTime, s.time, type) < 0) {
          beaten++;
        }
      });

      const totalOthers = scores.length - 1; // exclude self
      const percentile = totalOthers > 0 ? Math.round((beaten / totalOthers) * 100) : 50;

      ranks.push({
        name,
        type,
        percentile,
        bestScore: formatScore(userBestTime, type),
        totalAthletes: scores.length,
      });
    });

    return ranks.sort((a, b) => b.percentile - a.percentile);
  }, [userBenchmarks, allBenchmarkResults, currentUser]);

  if (rankings.length === 0 && !loading) return null;

  const visibleRankings = expanded ? rankings : rankings.slice(0, 3);

  const getPercentileColor = (pct) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-yellow-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPercentileText = (pct) => {
    if (pct >= 90) return 'Elite';
    if (pct >= 75) return 'Strong';
    if (pct >= 50) return 'Above Avg';
    if (pct >= 25) return 'Average';
    return 'Building';
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Box Rankings</h3>
        {loading && (
          <span className="text-slate-500 text-xs">Loading...</span>
        )}
      </div>

      {rankings.length === 0 && loading && (
        <div className="text-slate-500 text-sm text-center py-4">Loading rankings...</div>
      )}

      <div className="space-y-3">
        {visibleRankings.map((rank) => (
          <button
            key={rank.name}
            onClick={() => onBenchmarkClick?.(rank.name)}
            className="w-full text-left bg-slate-700/50 rounded-xl p-3 hover:bg-slate-700/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{rank.name}</span>
                <span className="bg-yellow-600/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded">
                  {rank.type}
                </span>
              </div>
              <div className="text-right">
                <span className="text-white font-semibold text-sm">{rank.bestScore}</span>
              </div>
            </div>
            {/* Percentile bar */}
            <div className="relative h-2 bg-slate-600 rounded-full overflow-hidden mb-1.5">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${getPercentileColor(rank.percentile)}`}
                style={{ width: `${rank.percentile}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">
                Faster than {rank.percentile}% of {rank.totalAthletes} athletes
              </span>
              <span className={`text-xs font-semibold ${
                rank.percentile >= 75 ? 'text-green-400' :
                rank.percentile >= 50 ? 'text-blue-400' :
                rank.percentile >= 25 ? 'text-yellow-400' : 'text-slate-400'
              }`}>
                {getPercentileText(rank.percentile)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {rankings.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-slate-400 hover:text-white text-sm mt-3 py-2"
        >
          {expanded ? (
            <>Show Less <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show All ({rankings.length}) <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
