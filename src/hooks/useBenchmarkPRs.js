import { useState } from 'react';
import { getBenchmarkByName, isBenchmarkWod } from '../lib/benchmarks';
import { compareScores } from '../lib/score-utils';

export function useBenchmarkPRs() {
  const [benchmarkPRs, setBenchmarkPRs] = useState([]);

  const calculateBenchmarkPRs = (results, wods) => {
    if (!results || results.length === 0) return [];

    const wodNameMap = {};
    wods.forEach(wod => {
      if (wod.name && isBenchmarkWod(wod.name)) {
        wodNameMap[wod.id] = wod.name;
      }
    });

    const benchmarkResults = {};
    results.forEach(result => {
      if (!result.wodId) return;

      const wodName = wodNameMap[result.wodId];
      if (!wodName) return;

      const benchmark = getBenchmarkByName(wodName);
      if (!benchmark) return;

      const normalizedName = benchmark.name;

      if (!benchmarkResults[normalizedName]) {
        benchmarkResults[normalizedName] = [];
      }
      benchmarkResults[normalizedName].push(result);
    });

    const prs = [];
    Object.entries(benchmarkResults).forEach(([name, attempts]) => {
      if (attempts.length === 0) return;

      const benchmark = getBenchmarkByName(name);
      const benchmarkType = benchmark?.type || 'For Time';

      const best = attempts.reduce((prev, curr) =>
        compareScores(curr.time, prev.time, benchmarkType) < 0 ? curr : prev
      );

      prs.push({
        name,
        type: benchmarkType,
        bestTime: best.time,
        date: best.date,
        attemptCount: attempts.length,
        resultId: best.id
      });
    });

    prs.sort((a, b) => new Date(b.date) - new Date(a.date));

    return prs;
  };

  return { benchmarkPRs, setBenchmarkPRs, calculateBenchmarkPRs };
}
