import React, { useState } from 'react';
import { Dumbbell, Calendar } from 'lucide-react';
import { formatScore } from '../../lib/score-utils';
import { isBenchmarkWod } from '../../lib/benchmarks';

export default function CoachHistoryView({
  workoutResults,
  allWODs,
  allAthleteResults,
  currentUser,
  editPastWorkout,
  deleteWorkout,
  showDeleteConfirm,
  setShowDeleteConfirm,
  photoModalUrl,
  setPhotoModalUrl,
  navigate,
}) {
  const [coachHistorySearch, setCoachHistorySearch] = useState('');

  const myWorkouts = workoutResults.filter(r => r.athleteEmail === currentUser.email);
  const filteredWorkouts = myWorkouts
    .filter(result => {
      if (!coachHistorySearch) return true;
      const searchLower = coachHistorySearch.toLowerCase();
      const wod = allWODs.find(w => w.date === result.date);
      const dateStr = new Date(result.date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      }).toLowerCase();
      return (
        (wod?.name?.toLowerCase() || '').includes(searchLower) ||
        dateStr.includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Workout History</h2>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by workout name or date..."
            value={coachHistorySearch}
            onChange={(e) => setCoachHistorySearch(e.target.value)}
            className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
          />
          {coachHistorySearch && (
            <button
              onClick={() => setCoachHistorySearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Workout List */}
      {filteredWorkouts.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {coachHistorySearch ? 'No workouts match your search' : 'No workouts logged yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">{filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''} found</p>
          {filteredWorkouts.map((result) => {
            const wod = allWODs.find(w => w.date === result.date);
            const completedCount = allAthleteResults.filter(r => r.date === result.date).length;

            return (
              <div
                key={result.id}
                className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
              >
                {/* Delete Confirmation */}
                {showDeleteConfirm === result.id && (
                  <div className="bg-red-600 p-4">
                    <p className="text-white font-semibold mb-3">Delete this workout?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteWorkout(result.id)}
                        className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showDeleteConfirm !== result.id && (
                  <>
                    <div
                      onClick={() => editPastWorkout(result)}
                      className="p-4 active:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
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
                          <div className="bg-slate-700 px-3 py-1 rounded-lg ml-2">
                            <span className="text-white font-bold text-sm">{formatScore(result.time, result.customWodType || wod?.type || 'Other')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mb-3 text-xs">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3 text-red-500" />
                          <span className="text-slate-300">
                            {new Date(result.date).toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span><span className="text-green-400 font-medium">{completedCount}</span> completed</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {result.movements.slice(0, 4).map((movement, idx) => (
                          <div key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                            <span className="text-white font-medium">{movement.name}</span>
                            {movement.weight && (
                              <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                            )}
                          </div>
                        ))}
                        {result.movements.length > 4 && (
                          <div className="bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-400">
                            +{result.movements.length - 4} more
                          </div>
                        )}
                      </div>

                      {result.photoData && (
                        <div
                          className="mt-3 -mx-4 -mb-4 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoModalUrl(result.photoData);
                          }}
                        >
                          <img src={result.photoData} alt="Workout" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </div>
                      )}
                    </div>

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
        </div>
      )}
    </div>
  );
}
