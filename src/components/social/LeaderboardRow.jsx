import React from 'react';
import { formatScore } from '../../lib/score-utils';

const MEDAL_COLORS = {
  1: 'bg-yellow-500 text-yellow-900',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-amber-700 text-amber-100',
};

export default function LeaderboardRow({ rank, result, wodType, isCurrentUser }) {
  const medalClass = MEDAL_COLORS[rank];

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${
        isCurrentUser ? 'bg-red-600/10 border border-red-600/30' : ''
      }`}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8">
        {medalClass ? (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${medalClass}`}>
            {rank}
          </div>
        ) : (
          <div className="text-slate-400 text-sm font-medium text-center w-7">
            {rank}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className={`font-medium text-sm truncate block ${isCurrentUser ? 'text-white' : 'text-slate-200'}`}>
          {result.athleteName}
          {isCurrentUser && <span className="text-red-400 ml-1 text-xs">(You)</span>}
        </span>
      </div>

      {/* RX Badge */}
      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
        result.rx !== false ? 'bg-green-600/20 text-green-400' : 'bg-amber-600/20 text-amber-400'
      }`}>
        {result.rx !== false ? 'RX' : 'SC'}
      </span>

      {/* Score */}
      <div className="flex-shrink-0">
        <span className="text-white font-bold text-sm">
          {formatScore(result.time, wodType)}
        </span>
      </div>
    </div>
  );
}
