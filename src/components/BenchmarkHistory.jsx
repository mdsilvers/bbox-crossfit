import React, { useMemo } from 'react';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  getScoreCategory, isLowerBetter, parseTimeToSeconds, amrapToNumeric,
  formatScore, compareScores, secondsToTimeStr
} from '../lib/score-utils';
import { getBenchmarkByName } from '../lib/benchmarks';

export default function BenchmarkHistory({ benchmarkName, results, allWODs, onBack }) {
  const benchmark = getBenchmarkByName(benchmarkName);
  const wodType = benchmark?.type || 'For Time';
  const category = getScoreCategory(wodType);
  const lowerIsBetter = isLowerBetter(wodType);

  const { chartData, bestResult, firstResult, improvement, attempts } = useMemo(() => {
    if (!results || results.length === 0) {
      return { chartData: [], bestResult: null, firstResult: null, improvement: null, attempts: [] };
    }

    // Build WOD name map
    const wodNameMap = {};
    (allWODs || []).forEach(wod => {
      if (wod.name) wodNameMap[wod.id] = wod.name;
    });

    // Filter results for this benchmark
    const benchmarkResults = results.filter(r => {
      const wodName = r.customWodName || wodNameMap[r.wodId];
      if (!wodName) return false;
      const bm = getBenchmarkByName(wodName);
      return bm && bm.name === benchmarkName;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (benchmarkResults.length === 0) {
      return { chartData: [], bestResult: null, firstResult: null, improvement: null, attempts: [] };
    }

    // Convert scores to numeric for charting
    const toNumeric = (time) => {
      if (!time) return null;
      if (category === 'time') return parseTimeToSeconds(time);
      if (category === 'amrap') return amrapToNumeric(time);
      return parseFloat(time) || null;
    };

    const data = benchmarkResults.map(r => {
      const numericScore = toNumeric(r.time);
      return {
        date: r.date,
        dateLabel: format(parseISO(r.date), 'MMM d'),
        score: numericScore,
        displayScore: formatScore(r.time, wodType),
        rawTime: r.time,
        notes: r.notes,
        id: r.id,
        // For time WODs, invert for chart display (lower time = higher on chart)
        chartValue: lowerIsBetter && numericScore != null ? -numericScore : numericScore,
      };
    });

    // Find best result using compareScores
    let best = benchmarkResults[0];
    for (let i = 1; i < benchmarkResults.length; i++) {
      if (benchmarkResults[i].time && best.time &&
          compareScores(benchmarkResults[i].time, best.time, wodType) < 0) {
        best = benchmarkResults[i];
      }
    }

    const first = benchmarkResults[0];
    let improv = null;
    if (first.time && best.time && first !== best) {
      const firstNum = toNumeric(first.time);
      const bestNum = toNumeric(best.time);
      if (firstNum != null && bestNum != null && firstNum !== 0) {
        if (lowerIsBetter) {
          improv = ((firstNum - bestNum) / firstNum) * 100;
        } else {
          improv = ((bestNum - firstNum) / firstNum) * 100;
        }
      }
    }

    return {
      chartData: data,
      bestResult: best,
      firstResult: first,
      improvement: improv,
      attempts: benchmarkResults,
    };
  }, [results, allWODs, benchmarkName, wodType, category, lowerIsBetter]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold">{data.dateLabel}</p>
        <p className="text-red-400">{data.displayScore}</p>
        {data.notes && <p className="text-slate-400 text-xs mt-1">{data.notes}</p>}
      </div>
    );
  };

  const formatYAxis = (value) => {
    if (category === 'time') {
      const secs = lowerIsBetter ? -value : value;
      return secondsToTimeStr(Math.abs(secs));
    }
    if (category === 'amrap') {
      const rounds = Math.floor(value / 1000);
      const reps = value % 1000;
      return reps > 0 ? `${rounds}+${reps}` : `${rounds}`;
    }
    return String(value);
  };

  // Find best data point for reference dot
  const bestDataPoint = chartData.find(d => d.id === bestResult?.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white p-2 -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{benchmarkName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
              {wodType}
            </span>
            <span className="text-slate-400 text-sm">
              {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Best Score + Improvement */}
      {bestResult && (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-yellow-600/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Personal Best</div>
              <div className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
                🏆 {formatScore(bestResult.time, wodType)}
              </div>
              <div className="text-slate-400 text-sm mt-1">
                {format(parseISO(bestResult.date), 'MMM d, yyyy')}
              </div>
            </div>
            {improvement != null && improvement > 0 && (
              <div className="text-right">
                <div className="text-green-400 text-sm font-semibold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {improvement.toFixed(1)}% improved
                </div>
                <div className="text-slate-500 text-xs mt-1">from first attempt</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Progress Over Time</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatYAxis}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="chartValue"
                  stroke="#c95f5f"
                  strokeWidth={2}
                  dot={{ fill: '#c95f5f', r: 4 }}
                  activeDot={{ r: 6, fill: '#ef4444' }}
                />
                {bestDataPoint && (
                  <ReferenceDot
                    x={bestDataPoint.dateLabel}
                    y={bestDataPoint.chartValue}
                    r={8}
                    fill="#d4ba6a"
                    stroke="#c9a84e"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* All Attempts Table */}
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">All Attempts</h3>
        <div className="space-y-2">
          {[...attempts].reverse().map((attempt, idx) => {
            const isBest = attempt.id === bestResult?.id;
            return (
              <div
                key={attempt.id}
                className={`rounded-xl p-3 flex items-center justify-between ${
                  isBest ? 'bg-yellow-600/10 border border-yellow-600/30' : 'bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isBest ? 'bg-yellow-600 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    {isBest ? '🏆' : `#${attempts.length - idx}`}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {formatScore(attempt.time, wodType)}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {format(parseISO(attempt.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                {attempt.notes && (
                  <div className="text-slate-500 text-xs max-w-[120px] truncate">
                    {attempt.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
