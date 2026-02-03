import React from 'react';
import { Plus, Dumbbell, Clock, Calendar, Trophy } from 'lucide-react';
import { formatScore, getScoreLabel } from '../../lib/score-utils';
import { isBenchmarkWod } from '../../lib/benchmarks';
import { getLocalToday } from '../../lib/constants';
import Leaderboard from '../social/Leaderboard';
import ReactionBar from '../social/ReactionBar';
import CommentThread from '../social/CommentThread';
import StreakBadge from '../social/StreakBadge';

export default function AthleteHomeDash({
  currentUser,
  stats,
  benchmarkPRs,
  todayWOD,
  missedWODs,
  workoutResults,
  allAthleteResults = [],
  allWODs,
  myResult,
  startLogMissedWOD,
  startCustomWorkout,
  editPastWorkout,
  deleteWorkout,
  showDeleteConfirm,
  setShowDeleteConfirm,
  photoModalUrl,
  setPhotoModalUrl,
  navigate,
  reactions = {},
  comments = {},
  onToggleReaction,
  onPostComment,
  onDeleteComment,
  loadReactionsForResults,
  myBadges = [],
  streakWeeks = 0,
  showWorkoutSummary,
}) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-red-600 rounded-2xl p-5">
          <div className="text-red-100 text-xs font-medium tracking-wide mb-1">TOTAL</div>
          <div className="text-4xl font-bold text-white mb-1">{stats.totalWorkouts}</div>
          <div className="text-red-200 text-sm">Workouts</div>
        </div>
        <div className="bg-orange-600 rounded-2xl p-5">
          <div className="text-orange-100 text-xs font-medium tracking-wide mb-1">THIS WEEK</div>
          <div className="text-4xl font-bold text-white mb-1">
            {stats.currentStreak}/7
          </div>
          <div className="text-orange-200 text-sm">
            {streakWeeks > 0 ? <StreakBadge weeks={streakWeeks} /> : (stats.currentStreak >= 3 ? 'Strong!' : 'WODs')}
          </div>
        </div>
        <div className="bg-blue-600 rounded-2xl p-5">
          <div className="text-blue-100 text-xs font-medium tracking-wide mb-1">THIS MONTH</div>
          <div className="text-4xl font-bold text-white mb-1">{stats.thisMonth}</div>
          <div className="text-blue-200 text-sm">Workouts</div>
        </div>
        <div className="bg-purple-600 rounded-2xl p-5">
          <div className="text-purple-100 text-xs font-medium tracking-wide mb-1">THIS YEAR</div>
          <div className="text-4xl font-bold text-white mb-1">{stats.thisYear}</div>
          <div className="text-purple-200 text-sm">Workouts</div>
        </div>
      </div>

      {/* Personal Records Section */}
      {benchmarkPRs.length > 0 && (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-yellow-600/30 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-white">Personal Records</h3>
            <span className="bg-yellow-600/20 text-yellow-400 text-xs px-2 py-0.5 rounded font-semibold">
              {benchmarkPRs.length} PR{benchmarkPRs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {benchmarkPRs.slice(0, 5).map((pr, idx) => (
              <div key={idx} className="bg-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{pr.name}</span>
                    <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                      {pr.type}
                    </span>
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    {pr.attemptCount} attempt{pr.attemptCount !== 1 ? 's' : ''} • Last: {new Date(pr.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold text-lg">{formatScore(pr.bestTime, pr.type)}</div>
                </div>
              </div>
            ))}
          </div>
          {benchmarkPRs.length > 5 && (
            <div className="mt-3 text-center">
              <span className="text-slate-400 text-sm">
                + {benchmarkPRs.length - 5} more benchmark{benchmarkPRs.length - 5 !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Action - Today's WOD Status */}
      {todayWOD && myResult.isCustomResult ? (
        /* Custom Workout Completed - Show custom workout instead of daily WOD */
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl mb-8 border border-violet-700/50 shadow-lg overflow-hidden">
          <div
            className="p-5 sm:p-6 cursor-pointer active:bg-slate-700 transition-colors"
            onClick={() => {
              const todayResult = workoutResults.find(r => r.date === getLocalToday());
              if (todayResult) showWorkoutSummary(todayResult);
            }}
          >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
            <span className="text-green-400 text-sm font-semibold">Today's Workout Logged</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {myResult.customWodName ? `"${myResult.customWodName}"` : 'Custom Workout'}
            </h3>
            {myResult.customWodType && (
              <span className="bg-violet-600 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                {myResult.customWodType}
              </span>
            )}
            <span className="bg-slate-600 text-slate-300 text-xs px-2.5 py-1 rounded-lg">
              Custom
            </span>
          </div>
          {myResult.time && (
            <div className="text-slate-300 text-sm mb-3">{getScoreLabel(myResult.customWodType || 'Other')}: <span className="text-white font-semibold">{formatScore(myResult.time, myResult.customWodType || 'Other')}</span></div>
          )}

          {/* Custom workout movements */}
          <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
            <div className="space-y-2">
              {(() => { let num = 0; return myResult.movements.map((movement, idx) => {
                if (movement.type === 'header') {
                  return (
                    <div key={idx} className="border-l-4 border-amber-500 pl-4 py-1">
                      <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider">{movement.name}</div>
                    </div>
                  );
                }
                num++;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="bg-violet-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {num}
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">{movement.name}</span>
                      {movement.reps && <span className="text-slate-400 ml-2 text-sm">{movement.reps}</span>}
                      {movement.weight && <span className="text-slate-400 ml-2 text-sm">@ {movement.weight}</span>}
                    </div>
                  </div>
                );
              }); })()}
            </div>
          </div>

          </div>
          {/* View Today's WOD link */}
          <div className="border-t border-slate-700 px-5 sm:px-6 py-3">
            <div className="text-slate-400 text-xs mb-2">Today's coach WOD is also available:</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">
                  {todayWOD.name ? `"${todayWOD.name}"` : "Daily WOD"}
                </span>
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                  {todayWOD.type}
                </span>
              </div>
              <button
                onClick={() => navigate('workout')}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Log Instead
              </button>
            </div>
          </div>
        </div>
      ) : todayWOD ? (() => {
        const completedThisWod = myResult.existingResultId && !myResult.existingResultForDifferentWod;
        return (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl mb-8 border border-slate-700/50 shadow-lg overflow-hidden">
          <div
            className={`p-5 sm:p-6 ${completedThisWod ? 'cursor-pointer active:bg-slate-700 transition-colors' : ''}`}
            onClick={() => {
              if (!completedThisWod) return;
              const todayResult = workoutResults.find(r => r.date === getLocalToday());
              if (todayResult) showWorkoutSummary(todayResult);
            }}
          >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {todayWOD.name ? `"${todayWOD.name}"` : "Today's WOD"}
                </h3>
                <span className="bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                  {todayWOD.type}
                </span>
                <span className="bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg capitalize">
                  {todayWOD.group}
                </span>
                {todayWOD.name && isBenchmarkWod(todayWOD.name) && (
                  <span className="bg-yellow-600 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                    Benchmark
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-sm mb-4">
                Posted by {todayWOD.postedBy}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-4">
                {completedThisWod ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                    {myResult.time && (
                      <span className="text-slate-400 text-sm">• {formatScore(myResult.time, todayWOD?.type || 'Other')}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-yellow-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Not logged yet
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* WOD Details Preview */}
          <div className="bg-slate-700/50 rounded-xl p-4 sm:p-5 mb-5">
            <div className="space-y-3">
              {(() => { let num = 0; return todayWOD.movements.map((movement, idx) => {
                if (movement.type === 'header') {
                  return (
                    <div key={idx} className="border-l-4 border-amber-500 pl-4 py-1">
                      <div className="text-amber-400 text-sm font-semibold uppercase tracking-wider">{movement.name}</div>
                    </div>
                  );
                }
                num++;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      {num}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{movement.name}</div>
                      <div className="text-slate-300 text-sm">{movement.reps}</div>
                      {movement.notes && (
                        <div className="text-slate-400 text-sm mt-1">{movement.notes}</div>
                      )}
                    </div>
                  </div>
                );
              }); })()}
            </div>

            {todayWOD.notes && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="text-slate-400 text-sm">
                  <span className="font-semibold">Coach Notes:</span> {todayWOD.notes}
                </div>
              </div>
            )}
          </div>

          </div>
          {/* Action Button */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={() => navigate('workout')}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25 touch-target-lg"
          >
            {completedThisWod ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit My Results
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Log My Workout
              </>
            )}
          </button>

          {/* Custom Workout Option */}
          {!completedThisWod && (
            <button
              onClick={startCustomWorkout}
              className="w-full mt-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Did a different workout? Log custom WOD
            </button>
          )}
          </div>
        </div>
      ); })() : (
        <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 text-center border border-slate-700 mb-6">
          <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-2">No WOD Posted Yet</p>
          <p className="text-slate-400 text-sm mb-4">Your coach hasn't posted today's workout</p>
          <button
            onClick={startCustomWorkout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Log Custom Workout
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {todayWOD && (
        <Leaderboard
          date={todayWOD.date}
          wodType={todayWOD.type}
          wodName={todayWOD.name}
          wodId={todayWOD.id}
          currentUserId={currentUser.id}
          reactions={reactions}
          onToggleReaction={onToggleReaction}
          loadReactionsForResults={loadReactionsForResults}
        />
      )}

      {/* Activity Feed Link */}
      <button
        onClick={() => navigate('feed')}
        className="w-full bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-slate-700/50 text-left flex items-center justify-between hover:border-red-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-red-600/20 p-2 rounded-lg">
            <Dumbbell className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Activity Feed</div>
            <div className="text-slate-400 text-xs">See what everyone's been doing</div>
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Missed WODs Section */}
      {missedWODs.length > 0 && (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 mb-6 border border-amber-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Missed Workouts</h3>
              <p className="text-slate-400 text-sm">Log results for previous days</p>
            </div>
          </div>
          <div className="space-y-3">
            {missedWODs.map((wod) => (
              <div
                key={wod.id}
                className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 hover:border-amber-500/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-amber-400 text-sm font-medium">
                        {new Date(wod.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="bg-red-600/80 text-white text-xs px-2 py-0.5 rounded">
                        {wod.type}
                      </span>
                      {wod.name && isBenchmarkWod(wod.name) && (
                        <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                          Benchmark
                        </span>
                      )}
                    </div>
                    <div className="text-white font-medium mb-1">
                      {wod.name || `${wod.type} Workout`}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {wod.movements.filter(m => m.type !== 'header').length} movement{wod.movements.filter(m => m.type !== 'header').length !== 1 ? 's' : ''} • {wod.movements.filter(m => m.type !== 'header').slice(0, 2).map(m => m.name).join(', ')}{wod.movements.filter(m => m.type !== 'header').length > 2 ? '...' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => startLogMissedWOD(wod)}
                    className="ml-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      <div className="bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Recent Workouts</h3>
          {workoutResults.length > 0 && (
            <button
              onClick={() => navigate('history')}
              className="text-red-500 hover:text-red-400 text-sm font-semibold flex items-center gap-1"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        {workoutResults.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-base">No workouts logged yet. Time to crush it!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workoutResults.slice(0, 5).map((result) => {
              let wod = result.wodId ? allWODs.find(w => w.id === result.wodId) : null;
              if (!wod || wod.date !== result.date) {
                wod = allWODs.find(w => w.date === result.date) || wod;
              }
              const completedCount = result.wodId
                ? allAthleteResults.filter(r => r.wodId === result.wodId).length
                : 1;

              return (
                <div
                  key={result.id}
                  className="bg-slate-700 rounded-xl border border-slate-600 overflow-hidden"
                >
                  {/* Delete Confirmation Overlay */}
                  {showDeleteConfirm === result.id && (
                    <div className="bg-red-600 p-5">
                      <p className="text-white font-semibold mb-4">Delete this workout?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => deleteWorkout(result.id)}
                          className="flex-1 bg-white text-red-600 py-3 rounded-xl font-semibold touch-target"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 bg-red-700 text-white py-3 rounded-xl font-semibold touch-target"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main Card Content */}
                  {showDeleteConfirm !== result.id && (
                    <>
                      <div
                        className="p-5 cursor-pointer active:bg-slate-700 transition-colors"
                        onClick={() => showWorkoutSummary(result)}
                      >
                        {/* Header: WOD Name + Type */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {result.customWodName ? (
                                <h4 className="text-white font-bold text-lg">"{result.customWodName}"</h4>
                              ) : wod?.name ? (
                                <h4 className="text-white font-bold text-lg">"{wod.name}"</h4>
                              ) : (
                                <h4 className="text-white font-medium">Daily WOD</h4>
                              )}
                              {result.customWodType ? (
                                <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                  {result.customWodType}
                                </span>
                              ) : wod?.type && (
                                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                  {wod.type}
                                </span>
                              )}
                              {(result.customWodName || result.customWodType) && (
                                <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                              {wod?.name && isBenchmarkWod(wod.name) && (
                                <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                  Benchmark
                                </span>
                              )}
                            </div>
                          </div>
                          {result.time && (
                            <div className="bg-slate-700 px-3 py-1.5 rounded-lg ml-2">
                              <span className="text-white font-bold text-sm">{formatScore(result.time, result.customWodType || wod?.type || 'Other')}</span>
                            </div>
                          )}
                        </div>

                        {/* Date + Stats Row */}
                        <div className="flex items-center gap-4 mb-3 text-xs">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3 text-red-500" />
                            <span className="text-slate-300">
                              {new Date(result.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          {wod?.postedBy && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <span>Coach: <span className="text-slate-300">{wod.postedBy}</span></span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-slate-400">
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span><span className="text-green-400 font-medium">{completedCount}</span> completed</span>
                          </div>
                        </div>

                        {/* Movement Pills */}
                        {(() => {
                          const realMovements = result.movements.filter(m => m.type !== 'header');
                          return (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {realMovements.slice(0, 3).map((movement, idx) => (
                                <div key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                                  <span className="text-white font-medium">{movement.name}</span>
                                  {movement.weight && (
                                    <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                  )}
                                </div>
                              ))}
                              {realMovements.length > 3 && (
                                <div className="bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-400">
                                  +{realMovements.length - 3} more
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Social: Reactions & Comments */}
                        <ReactionBar
                          resultId={result.id}
                          reactions={reactions[result.id] || []}
                          currentUserId={currentUser.id}
                          onToggleReaction={onToggleReaction}
                          isOwnResult={true}
                        />
                        <CommentThread
                          resultId={result.id}
                          comments={comments[result.id] || []}
                          currentUser={currentUser}
                          onPost={onPostComment}
                          onDelete={onDeleteComment}
                        />

                        {result.photoData && (
                          <div
                            className="mt-3 -mx-4 -mb-4 cursor-pointer"
                            onClick={() => setPhotoModalUrl(result.photoData)}
                          >
                            <img
                              src={result.photoData}
                              alt="Workout"
                              className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="border-t border-slate-700 grid grid-cols-2">
                        <button
                          onClick={() => editPastWorkout(result)}
                          className="py-3 text-blue-400 hover:bg-slate-700 transition-colors font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(result.id)}
                          className="py-3 text-red-400 hover:bg-slate-700 transition-colors font-medium text-sm border-l border-slate-700"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {workoutResults.length > 5 && (
              <button
                onClick={() => navigate('history')}
                className="w-full text-center text-red-500 hover:text-red-400 text-sm py-3 font-medium"
              >
                View all {workoutResults.length} workouts →
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
