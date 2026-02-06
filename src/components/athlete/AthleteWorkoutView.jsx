import React from 'react';
import { Plus, Trash2, Calendar, Image } from 'lucide-react';
import ScoreInput from '../ScoreInput';
import RxToggle from '../shared/RxToggle';
import { STANDARD_MOVEMENTS } from '../../lib/constants';
import { isBenchmarkWod, getBenchmarkByName } from '../../lib/benchmarks';

export default function AthleteWorkoutView({
  todayWOD,
  myResult,
  setMyResult,
  editingWorkout,
  isCustomWorkout,
  customWod,
  setCustomWod,
  customMovementInput,
  setCustomMovementInput,
  showCustomMovementDropdown,
  setShowCustomMovementDropdown,
  customWodNameError,
  setCustomWodNameError,
  allWODs,
  logResult,
  logCustomWorkout,
  startCustomWorkout,
  cancelCustomWorkout,
  cancelEdit,
  handlePhotoUpload,
  updateMovementWeight,
  addCustomMovement,
  removeCustomMovement,
  updateCustomMovement,
  handleCustomMovementInput,
  selectCustomMovement,
  photoModalUrl,
  setPhotoModalUrl,
  navigate,
}) {
  return (
    <>
      {/* Today's WOD */}
      {((todayWOD || editingWorkout) && !isCustomWorkout) ? (
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          {editingWorkout && (
            <div className="bg-blue-600 text-white px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">
                    Editing workout from {new Date(editingWorkout.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <button
                  onClick={cancelEdit}
                  className="text-white hover:text-blue-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {!editingWorkout && myResult.existingResultId && todayWOD && (
            <div className="bg-green-600 text-white px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <span className="font-semibold">Already Logged</span>
                  <p className="text-green-100 text-sm mt-0.5">You can update your time, weights, or notes below</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              {editingWorkout ? 'Edit Workout' : 'Today\'s WOD'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {todayWOD && !editingWorkout && (
                <>
                  <span className="bg-red-600 text-white text-sm px-3 py-1 rounded">{todayWOD.type}</span>
                  <span className="bg-slate-700 text-white text-sm px-3 py-1 rounded capitalize">{todayWOD.group}</span>
                  {todayWOD.name && isBenchmarkWod(todayWOD.name) && (
                    <span className="bg-yellow-600 text-white text-sm px-3 py-1 rounded font-semibold">Benchmark</span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {(editingWorkout ? editingWorkout.movements : todayWOD?.movements || []).map((movement, idx) => (
              movement.type === 'header' ? (
                <div key={idx} className="border-l-4 border-amber-500 pl-4 py-2">
                  <div className="text-amber-400 text-sm font-semibold uppercase tracking-wider">{movement.name}</div>
                </div>
              ) : (
                <div key={idx} className="bg-slate-700 rounded-lg p-4">
                  <div className="font-bold text-white text-lg mb-1">{movement.name}</div>
                  <div className="text-slate-400 mb-3">
                    {movement.reps}
                    {movement.notes && <span className="text-sm ml-2">({movement.notes})</span>}
                  </div>
                  <input
                    type="text"
                    placeholder="Your weight (e.g., 34kg, scaled, bodyweight)"
                    value={myResult.movements[idx]?.weight || ''}
                    onChange={(e) => updateMovementWeight(idx, e.target.value, editingWorkout?.movements || todayWOD?.movements)}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
              )
            ))}
          </div>

          {todayWOD?.photoData && !editingWorkout && (
            <img
              src={todayWOD.photoData}
              alt="WOD Board"
              className="w-full rounded-lg max-h-64 object-cover mb-4 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setPhotoModalUrl(todayWOD.photoData)}
            />
          )}

          {todayWOD?.notes && !editingWorkout && (
            <div className="bg-slate-700 rounded p-3 mb-4 text-slate-300 text-sm">
              <strong>Coach Notes:</strong> {todayWOD.notes}
            </div>
          )}

          <RxToggle
            value={myResult.rx ?? true}
            onChange={(val) => setMyResult({ ...myResult, rx: val })}
          />

          <div className="mb-4">
            <ScoreInput
              wodType={editingWorkout ? (editingWorkout.customWodType || allWODs.find(w => w.id === editingWorkout.wodId)?.type || 'Other') : (todayWOD?.type || 'Other')}
              value={myResult.time}
              onChange={(val) => setMyResult({ ...myResult, time: val })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Add Photo</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
                <Image className="w-5 h-5" />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
                <Image className="w-5 h-5" />
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {myResult.photoData && (
              <div className="relative">
                <img
                  src={myResult.photoData}
                  alt="Preview"
                  className="w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPhotoModalUrl(myResult.photoData)}
                />
                <button
                  onClick={() => setMyResult({ ...myResult, photoData: null })}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Notes</label>
            <textarea
              placeholder="How did it feel? Any modifications?"
              value={myResult.notes}
              onChange={(e) => setMyResult({ ...myResult, notes: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-24"
            />
          </div>

          <button
            onClick={logResult}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {myResult.existingResultId ? 'Update Workout' : 'Log Workout'}
          </button>

          {editingWorkout && (
            <button
              onClick={cancelEdit}
              className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      ) : !isCustomWorkout ? (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-700/50 mb-6">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No WOD posted for today yet.</p>
          <button
            onClick={startCustomWorkout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Log Custom Workout
          </button>
        </div>
      ) : (
        /* Custom Workout Form */
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Custom Workout</h2>
            <button
              onClick={cancelCustomWorkout}
              className="text-slate-400 hover:text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Workout Name */}
          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Workout Name (optional)</label>
            <input
              type="text"
              placeholder="e.g., Travel WOD, Hotel Workout"
              value={customWod.name}
              onChange={(e) => {
                const name = e.target.value;
                setCustomWod({ ...customWod, name });
                // Check if name matches a benchmark WOD
                if (isBenchmarkWod(name)) {
                  setCustomWodNameError(`"${getBenchmarkByName(name).name}" is a benchmark WOD. Please use a different name or log it as the official benchmark when a coach posts it.`);
                } else {
                  setCustomWodNameError('');
                }
              }}
              className={`w-full bg-slate-700 text-white px-4 py-3 rounded-lg border ${customWodNameError ? 'border-red-500' : 'border-slate-600'} focus:border-red-500 focus:outline-none`}
            />
            {customWodNameError && (
              <p className="text-red-400 text-sm mt-2">{customWodNameError}</p>
            )}
          </div>

          {/* Workout Type */}
          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Workout Type</label>
            <select
              value={customWod.type}
              onChange={(e) => setCustomWod({ ...customWod, type: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
            >
              <option value="For Time">For Time</option>
              <option value="AMRAP">AMRAP</option>
              <option value="EMOM">EMOM</option>
              <option value="Interval">Interval</option>
              <option value="Rounds">Rounds</option>
              <option value="Strength">Strength</option>
              <option value="Skill">Skill</option>
              <option value="Chipper">Chipper</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Movements */}
          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Movements</label>
            <div className="space-y-3">
              {customWod.movements.map((movement, idx) => (
                <div key={idx} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Movement name"
                        value={customMovementInput[idx] || ''}
                        onChange={(e) => handleCustomMovementInput(idx, e.target.value)}
                        onFocus={() => {
                          const newDropdowns = showCustomMovementDropdown.map((_, i) => i === idx && customMovementInput[idx]?.length > 0);
                          setShowCustomMovementDropdown(newDropdowns);
                        }}
                        className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                      />
                      {showCustomMovementDropdown[idx] && (
                        <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                          {STANDARD_MOVEMENTS
                            .filter(m => m.toLowerCase().includes((customMovementInput[idx] || '').toLowerCase()))
                            .slice(0, 8)
                            .map((m) => (
                              <button
                                key={m}
                                onClick={() => selectCustomMovement(idx, m)}
                                className="w-full text-left px-3 py-2 text-white hover:bg-slate-700"
                              >
                                {m}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {customWod.movements.length > 1 && (
                      <button
                        onClick={() => removeCustomMovement(idx)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Reps (e.g., 21-15-9, 10 rounds)"
                    value={movement.reps}
                    onChange={(e) => updateCustomMovement(idx, 'reps', e.target.value)}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={addCustomMovement}
              className="mt-3 text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Movement
            </button>
          </div>

          {/* RX/Scaled Toggle */}
          <RxToggle
            value={myResult.rx ?? true}
            onChange={(val) => setMyResult({ ...myResult, rx: val })}
          />

          {/* Time Result */}
          <div className="mb-4">
            <ScoreInput
              wodType={customWod.type}
              value={myResult.time}
              onChange={(val) => setMyResult({ ...myResult, time: val })}
            />
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-slate-300 mb-2">Notes</label>
            <textarea
              placeholder="How did it feel? Any modifications?"
              value={myResult.notes}
              onChange={(e) => setMyResult({ ...myResult, notes: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-24"
            />
          </div>

          {/* Photo Upload */}
          <div className="mb-6">
            <label className="block text-slate-300 mb-2">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full text-slate-400"
            />
            {myResult.photoData && (
              <div className="mt-2 relative inline-block">
                <img
                  src={myResult.photoData}
                  alt="Workout"
                  className="h-24 rounded"
                />
                <button
                  onClick={() => setMyResult({ ...myResult, photoData: null })}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={logCustomWorkout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Log Custom Workout
          </button>

          <button
            onClick={cancelCustomWorkout}
            className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
