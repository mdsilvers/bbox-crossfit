import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import LeaderboardRow from './LeaderboardRow';

export default function Leaderboard({ date, wodType, wodName, wodId, currentUserId, reactions = {}, onToggleReaction, loadReactionsForResults }) {
  const { leaderboardResults, rankedCount, loading, genderFilter, setGenderFilter } = useLeaderboard(date, wodType, wodId);
  const [expanded, setExpanded] = useState(false);

  // Load reactions for leaderboard results
  useEffect(() => {
    if (leaderboardResults.length > 0 && loadReactionsForResults) {
      const ids = leaderboardResults.map(r => r.id);
      loadReactionsForResults(ids);
    }
  }, [leaderboardResults.length]);

  if (loading && leaderboardResults.length === 0) {
    return null;
  }

  if (leaderboardResults.length === 0) {
    return null;
  }

  const displayResults = expanded ? leaderboardResults : leaderboardResults.slice(0, 5);

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-white">Leaderboard</h3>
          <span className="text-slate-400 text-xs">
            {leaderboardResults.length} result{leaderboardResults.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Gender Filter */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'mens', label: 'Men' },
          { key: 'womens', label: 'Women' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setGenderFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              genderFilter === f.key
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-1">
        {displayResults.map((result, idx) => {
          const isRanked = idx < rankedCount;

          return (
            <LeaderboardRow
              key={result.id}
              rank={isRanked ? idx + 1 : null}
              result={result}
              wodType={wodType}
              isCurrentUser={result.athleteId === currentUserId}
              reactions={reactions[result.id] || []}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
            />
          );
        })}
      </div>

      {/* Show More / Less */}
      {leaderboardResults.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 text-center text-red-500 hover:text-red-400 text-sm font-medium py-2"
        >
          {expanded ? 'Show Less' : `View Full Leaderboard (${leaderboardResults.length})`}
        </button>
      )}
    </div>
  );
}
