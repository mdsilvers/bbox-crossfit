import React, { useState, useEffect } from 'react';
import { Users, Calendar } from 'lucide-react';
import { formatScore } from '../../lib/score-utils';
import { isBenchmarkWod } from '../../lib/benchmarks';
import ReactionBar from '../social/ReactionBar';
import CommentThread from '../social/CommentThread';
import BadgeIcons from '../social/BadgeIcons';

export default function CoachAthleteList({
  allAthleteResults,
  allWODs,
  currentUser,
  allUserBadges = {},
  photoModalUrl,
  setPhotoModalUrl,
  reactions = {},
  comments = {},
  onToggleReaction,
  onPostComment,
  onDeleteComment,
  loadReactionsForResults,
  loadCommentsForResults,
}) {
  const [expandedAthlete, setExpandedAthlete] = useState(null);

  // Load social data when athlete is expanded
  useEffect(() => {
    if (expandedAthlete && loadReactionsForResults) {
      const athleteWorkouts = allAthleteResults.filter(r => r.athleteEmail === expandedAthlete);
      const ids = athleteWorkouts.map(r => r.id);
      if (ids.length > 0) {
        loadReactionsForResults(ids);
        loadCommentsForResults(ids);
      }
    }
  }, [expandedAthlete]);

  // Group results by athlete - use allAthleteResults for coaches
  const athleteData = {};
  allAthleteResults.forEach(result => {
    if (!athleteData[result.athleteEmail]) {
      athleteData[result.athleteEmail] = {
        name: result.athleteName,
        email: result.athleteEmail,
        userId: result.athleteId,
        workouts: []
      };
    }
    athleteData[result.athleteEmail].workouts.push(result);
  });

  // Convert to array and calculate stats
  const athletes = Object.values(athleteData).map(athlete => {
    const workouts = athlete.workouts.sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    // Calculate stats
    const thisWeek = workouts.filter(w => {
      const workoutDate = new Date(w.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return workoutDate >= weekAgo;
    }).length;

    const lastWorkout = workouts[0];
    const lastWorkoutDate = lastWorkout ? new Date(lastWorkout.date) : null;
    const daysAgo = lastWorkoutDate ?
      Math.floor((new Date() - lastWorkoutDate) / (1000 * 60 * 60 * 24)) : null;

    return {
      ...athlete,
      total: workouts.length,
      thisWeek,
      lastWorkout,
      daysAgo
    };
  }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Athletes</h2>

      {athletes.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No athletes have logged workouts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {athletes.map((athlete) => (
            <div key={athlete.email} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              {/* Athlete Header Card */}
              <div
                onClick={() => setExpandedAthlete(expandedAthlete === athlete.email ? null : athlete.email)}
                className="p-4 active:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {athlete.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{athlete.name}</h3>
                      <BadgeIcons earnedBadgeKeys={allUserBadges[athlete.userId] || []} size="xs" />
                      {athlete.daysAgo !== null && (
                        <p className="text-slate-400 text-xs">
                          {athlete.daysAgo === 0 ? 'Trained today' :
                           athlete.daysAgo === 1 ? 'Trained yesterday' :
                           `Trained ${athlete.daysAgo} days ago`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedAthlete === athlete.email ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-700 rounded-lg p-2 text-center">
                    <div className="text-white font-bold text-lg">{athlete.total}</div>
                    <div className="text-slate-400 text-xs">Total</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-2 text-center">
                    <div className={`font-bold text-lg ${athlete.thisWeek >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {athlete.thisWeek}/7
                    </div>
                    <div className="text-slate-400 text-xs">This Week</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-2 text-center">
                    <div className="text-white font-bold text-lg">
                      {athlete.daysAgo !== null ? athlete.daysAgo : '-'}
                    </div>
                    <div className="text-slate-400 text-xs">Days Ago</div>
                  </div>
                </div>
              </div>

              {/* Expanded Workout History */}
              {expandedAthlete === athlete.email && (
                <div className="border-t border-slate-700 bg-slate-900">
                  <div className="p-4">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-500" />
                      Workout History
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {athlete.workouts.map((workout) => {
                        // Find the WOD for this workout to get the name
                        const wod = allWODs.find(w => w.date === workout.date);

                        return (
                          <div
                            key={workout.id}
                            className="bg-slate-800 rounded-lg p-3 border border-slate-700"
                          >
                            {/* WOD Name + Type + Time Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  {workout.customWodName ? (
                                    <h5 className="text-white font-bold text-sm">"{workout.customWodName}"</h5>
                                  ) : wod?.name ? (
                                    <h5 className="text-white font-bold text-sm">"{wod.name}"</h5>
                                  ) : (
                                    <h5 className="text-white font-medium text-sm">Daily WOD</h5>
                                  )}
                                  {workout.customWodType ? (
                                    <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                      {workout.customWodType}
                                    </span>
                                  ) : wod?.type && (
                                    <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                      {wod.type}
                                    </span>
                                  )}
                                  {(workout.customWodName || workout.customWodType) && (
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
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-red-500" />
                                  <span className="text-slate-400 text-xs">
                                    {new Date(workout.date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              {workout.time && (
                                <div className="bg-slate-700 px-2 py-1 rounded ml-2">
                                  <span className="text-white text-xs font-bold">{formatScore(workout.time, workout.customWodType || wod?.type || 'Other')}</span>
                                </div>
                              )}
                            </div>

                            {/* Movements */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {workout.movements.map((movement, idx) => (
                                <div key={idx} className="bg-slate-700 px-2 py-1 rounded text-xs">
                                  <span className="text-white font-medium">{movement.name}</span>
                                  {movement.weight && (
                                    <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Photo thumbnail */}
                            {workout.photoData && (
                              <img
                                src={workout.photoData}
                                alt="Workout"
                                className="w-full rounded h-32 object-cover mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setPhotoModalUrl(workout.photoData)}
                              />
                            )}

                            {/* Notes */}
                            {workout.notes && (
                              <div className="text-slate-400 text-xs italic mb-2">
                                "{workout.notes}"
                              </div>
                            )}

                            {/* Social: Reactions & Comments */}
                            <ReactionBar
                              resultId={workout.id}
                              reactions={reactions[workout.id] || []}
                              currentUserId={currentUser.id}
                              onToggleReaction={onToggleReaction}
                              isOwnResult={false}
                            />
                            <CommentThread
                              resultId={workout.id}
                              comments={comments[workout.id] || []}
                              currentUser={currentUser}
                              onPost={onPostComment}
                              onDelete={onDeleteComment}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
