import React, { useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { formatScore, getScoreLabel, getScoreCategory } from '../../lib/score-utils';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import LeaderboardRow from '../social/LeaderboardRow';

const RANKABLE_TYPES = ['for time', 'amrap', 'strength', 'chipper', 'metcon'];

function isRankable(wodType) {
  if (!wodType) return false;
  return RANKABLE_TYPES.includes(wodType.toLowerCase().trim());
}

export default function PostWodSummary({
  result,
  wod,
  isUpdate = false,
  isCustomWorkout = false,
  mode = 'post-log',
  currentUser,
  reactions = {},
  onToggleReaction,
  loadReactionsForResults,
  onDismiss,
}) {
  const wodType = isCustomWorkout ? result?.customWodType : wod?.type;
  const wodName = isCustomWorkout
    ? (result?.customWodName || 'Custom Workout')
    : (wod?.name || 'Daily WOD');
  const date = result?.date || wod?.date;

  const showLeaderboard = !isCustomWorkout && wod && isRankable(wodType);

  const { leaderboardResults, rankedCount, totalParticipants, loading, genderFilter, setGenderFilter } =
    useLeaderboard(showLeaderboard ? date : null, wodType, wod?.id);

  // Load reactions for leaderboard results
  useEffect(() => {
    if (leaderboardResults.length > 0 && loadReactionsForResults) {
      const ids = leaderboardResults.map(r => r.id);
      loadReactionsForResults(ids);
    }
  }, [leaderboardResults.length]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  // Count participation (all results for this WOD, including those without a score)
  const participationCount = totalParticipants;

  // Find user's rank (only within ranked results)
  const userIdx = leaderboardResults.findIndex(r => r.athleteId === currentUser?.id);
  const userRank = userIdx >= 0 && userIdx < rankedCount ? userIdx + 1 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: 'rgba(28, 32, 39, 0.95)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col">

        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: '0ms' }}>
          {mode === 'post-log' ? (
            <>
              {/* Animated checkmark */}
              <div className="animate-scale-in-check mb-4">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {isUpdate ? 'Workout Updated!' : 'Workout Logged!'}
              </h1>
              <p className="text-slate-400 text-sm">
                {date && new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">
                {isCustomWorkout ? (result?.customWodName ? `"${result.customWodName}"` : 'Custom Workout') : (wod?.name ? `"${wod.name}"` : 'Daily WOD')}
              </h1>
              <p className="text-slate-400 text-sm">
                {date && new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })}
              </p>
            </>
          )}

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {wodType && (
              <span className={`text-white text-xs px-2.5 py-1 rounded-lg font-semibold ${
                isCustomWorkout ? 'bg-violet-600' : 'bg-red-600'
              }`}>
                {wodType}
              </span>
            )}
            {isCustomWorkout && (
              <span className="bg-slate-600 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
                Custom
              </span>
            )}
            {result?.rx !== undefined && (
              <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                result.rx !== false ? 'bg-green-600/20 text-green-400' : 'bg-amber-600/20 text-amber-400'
              }`}>
                {result.rx !== false ? 'RX' : 'Scaled'}
              </span>
            )}
          </div>
        </div>

        {/* Your Performance (only when result exists) */}
        {result && (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-slate-700/50 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <h3 className="text-sm font-semibold text-slate-400 tracking-wide mb-3">YOUR PERFORMANCE</h3>

          {/* Score */}
          {result.time ? (
            <div className="mb-4">
              <div className="text-slate-400 text-xs mb-1">{getScoreLabel(wodType)}</div>
              <div className="text-4xl font-bold text-white">
                {formatScore(result.time, wodType)}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-3xl font-bold text-green-400">Completed</div>
            </div>
          )}

          {/* Movements */}
          {result.movements && result.movements.length > 0 && (
            <div className="space-y-2">
              {result.movements.slice(0, 3).map((movement, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white ${
                    isCustomWorkout ? 'bg-violet-600' : 'bg-red-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-white text-sm font-medium">{movement.name}</span>
                  {movement.reps && <span className="text-slate-400 text-sm">{movement.reps}</span>}
                  {movement.weight && <span className="text-slate-400 text-sm">@ {movement.weight}</span>}
                </div>
              ))}
              {result.movements.length > 3 && (
                <div className="text-slate-400 text-sm ml-8">
                  +{result.movements.length - 3} more movement{result.movements.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {result.notes && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-slate-400 text-sm italic">"{result.notes}"</p>
            </div>
          )}
        </div>
        )}

        {/* Participation (coach WODs only) */}
        {showLeaderboard && participationCount > 0 && (
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-slate-700/50 animate-slide-up" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center gap-3">
              <div className="bg-green-600/20 p-2 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <span className="text-white font-semibold">{participationCount}</span>
                <span className="text-slate-400 text-sm ml-1">
                  athlete{participationCount !== 1 ? 's' : ''} completed this WOD
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mini Leaderboard */}
        {showLeaderboard && leaderboardResults.length > 0 && (
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-slate-700/50 animate-slide-up" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏆</span>
              <h3 className="text-sm font-semibold text-slate-400 tracking-wide">LEADERBOARD</h3>
            </div>

            {/* Gender Filter */}
            <div className="flex gap-1 mb-3">
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

            {/* All athletes */}
            <div className="space-y-1">
              {leaderboardResults.map((r, idx) => {
                const isRanked = idx < rankedCount;

                return (
                  <LeaderboardRow
                    key={r.id}
                    rank={isRanked ? idx + 1 : null}
                    result={r}
                    wodType={wodType}
                    isCurrentUser={r.athleteId === currentUser?.id}
                    reactions={reactions[r.id] || []}
                    currentUserId={currentUser?.id}
                    onToggleReaction={onToggleReaction}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Spacer to push button down */}
        <div className="flex-1"></div>

        {/* Done / Close Button */}
        <div className="animate-slide-up" style={{ animationDelay: '320ms' }}>
          <button
            onClick={onDismiss}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-4 rounded-xl font-semibold text-base transition-colors shadow-lg shadow-red-600/25"
          >
            {mode === 'post-log' ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
