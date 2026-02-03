import React from 'react';
import { Plus, Trash2, Dumbbell, Calendar, Users, Image } from 'lucide-react';
import { isBenchmarkWod, getBenchmarkByName, getBenchmarksByCategory } from '../../lib/benchmarks';
import { STANDARD_MOVEMENTS, getLocalToday } from '../../lib/constants';

export default function CoachProgramView({
  currentUser,
  allWODs,
  workoutResults,
  allAthleteResults,
  showWodReview,
  showWODForm,
  setShowWODForm,
  newWOD,
  setNewWOD,
  movementInput,
  setMovementInput,
  showMovementDropdown,
  setShowMovementDropdown,
  filteredMovements,
  editingWOD,
  setEditingWOD,
  showDeleteWODConfirm,
  setShowDeleteWODConfirm,
  postWOD,
  editWOD,
  deleteWOD,
  confirmDeleteWOD,
  addMovement,
  addSectionHeader,
  updateMovement,
  handleMovementInput,
  selectMovement,
  removeMovement,
  wodPhotoData,
  setWodPhotoData,
  handleWodPhotoUpload,
  coaches,
  selectedCoach,
  setSelectedCoach,
}) {
  return (
    <>
      {!showWODForm ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">WOD Programming</h2>
            <button
              onClick={() => {
                setEditingWOD(null);
                setWodPhotoData(null);
                setSelectedCoach({ id: currentUser.id, name: currentUser.name });
                setNewWOD({
                  name: '',
                  date: getLocalToday(),
                  type: 'For Time',
                  group: 'combined',
                  movements: [{ name: '', reps: '', notes: '' }],
                  notes: ''
                });
                setMovementInput(['']);
                setShowMovementDropdown([false]);
                setShowWODForm(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New WOD
            </button>
          </div>

          {allWODs.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
              <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No WODs programmed yet</p>
              <button
                onClick={() => setShowWODForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Program First WOD
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {allWODs.map((wod) => {
                const wodDate = new Date(wod.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                wodDate.setHours(0, 0, 0, 0);
                const isToday = wodDate.getTime() === today.getTime();
                const isPast = wodDate < today;
                const coachHasResult = workoutResults.find(r =>
                  r.date === wod.date && r.athleteEmail === currentUser.email
                );
                const completedCount = allAthleteResults.filter(r =>
                  r.wodId === wod.id || (r.date === wod.date && !r.customWodName && !r.customWodType)
                ).length;
                const isTappable = completedCount > 0 && showWodReview;

                return (
                  <div
                    key={wod.id}
                    className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
                  >
                    {/* Delete Confirmation Overlay */}
                    {showDeleteWODConfirm?.id === wod.id && (
                      <div className="bg-red-600 p-4">
                        <p className="text-white font-semibold mb-2">Delete this WOD?</p>
                        {coachHasResult && (
                          <p className="text-red-100 text-sm mb-3">
                            This will also delete your logged workout for this day.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={confirmDeleteWOD}
                            className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteWODConfirm(null)}
                            className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Main Card Content */}
                    {showDeleteWODConfirm?.id !== wod.id && (
                      <>
                    <div
                      className={`p-4${isTappable ? ' cursor-pointer active:bg-slate-700 transition-colors' : ''}`}
                      onClick={isTappable ? () => showWodReview(wod) : undefined}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          {wod.name && (
                            <div className="text-xl font-bold text-white mb-2">
                              "{wod.name}"
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-red-500" />
                            <span className="text-white font-bold">
                              {wodDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            {isToday && (
                              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                TODAY
                              </span>
                            )}
                            {isPast && !isToday && (
                              <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                Past
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
                              {wod.type}
                            </span>
                            <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded capitalize">
                              {wod.group}
                            </span>
                            {wod.name && isBenchmarkWod(wod.name) && (
                              <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded font-semibold">
                                Benchmark
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs">
                            Posted by {wod.postedBy}
                          </div>
                        </div>
                      </div>

                      {/* Movement Pills */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {wod.movements.map((movement, idx) => (
                          movement.type === 'header' ? (
                            <div key={idx} className="w-full text-amber-400 text-xs font-semibold uppercase tracking-wider mt-1">
                              {movement.name}
                            </div>
                          ) : (
                            <div key={idx} className="bg-slate-700 px-3 py-1.5 rounded-full text-sm">
                              <span className="text-white font-medium">{movement.name}</span>
                              <span className="text-slate-400 ml-1 text-xs">{movement.reps}</span>
                            </div>
                          )
                        ))}
                      </div>

                      {wod.notes && (
                        <div className="bg-slate-700 rounded p-2 text-slate-300 text-xs mb-3">
                          {wod.notes}
                        </div>
                      )}

                      {/* WOD Board Photo */}
                      {wod.photoData && (
                        <img
                          src={wod.photoData}
                          alt="WOD Board"
                          className="w-full rounded h-32 object-cover mb-3"
                        />
                      )}

                      {/* Completion count indicator */}
                      {completedCount > 0 && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Users className="w-3.5 h-3.5 text-green-400" />
                          <span>{completedCount} athlete{completedCount !== 1 ? 's' : ''} completed</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-slate-700 grid grid-cols-2">
                      <button
                        onClick={() => editWOD(wod)}
                        className="py-3 text-blue-400 hover:bg-slate-700 transition-colors font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWOD(wod)}
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
        </>
      ) : (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              {editingWOD ? 'Edit WOD' : 'Post New WOD'}
            </h2>
            <button
              onClick={() => {
                setShowWODForm(false);
                setEditingWOD(null);
                setWodPhotoData(null);
                setSelectedCoach({ id: currentUser.id, name: currentUser.name });
                setNewWOD({
                  name: '',
                  date: getLocalToday(),
                  type: 'For Time',
                  group: 'combined',
                  movements: [{ name: '', reps: '', notes: '' }],
                  notes: ''
                });
                setMovementInput(['']);
                setShowMovementDropdown([false]);
              }}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Posted By Selector */}
          {coaches.length > 1 && (
            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Posted by
              </label>
              <select
                value={selectedCoach?.id || currentUser.id}
                onChange={(e) => {
                  const coach = coaches.find(c => c.id === e.target.value);
                  if (coach) {
                    setSelectedCoach({ id: coach.id, name: coach.name });
                  }
                }}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
              >
                {coaches.map(coach => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}{coach.id === currentUser.id ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Benchmark WOD Selector */}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Benchmark Template <span className="text-slate-500">(Quick Fill)</span>
            </label>
            <select
              value=""
              onChange={(e) => {
                const benchmark = getBenchmarkByName(e.target.value);
                if (benchmark) {
                  setNewWOD({
                    ...newWOD,
                    name: benchmark.name,
                    type: benchmark.type,
                    movements: benchmark.movements.map(m => ({ ...m }))
                  });
                  setMovementInput(benchmark.movements.map(m => m.name));
                  setShowMovementDropdown(benchmark.movements.map(() => false));
                }
              }}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
            >
              <option value="">Select a benchmark WOD...</option>
              {Object.entries(getBenchmarksByCategory()).map(([category, wods]) => (
                <optgroup key={category} label={category}>
                  {wods.map(wod => (
                    <option key={wod.name} value={wod.name}>{wod.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* WOD Name Field */}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              WOD Name <span className="text-slate-500">(Optional)</span>
              {isBenchmarkWod(newWOD.name) && (
                <span className="ml-2 bg-yellow-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                  Benchmark
                </span>
              )}
            </label>
            <input
              type="text"
              placeholder='e.g., "Cindy", "Fran", "Murph"'
              value={newWOD.name}
              onChange={(e) => setNewWOD({ ...newWOD, name: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-slate-300 mb-2 text-sm">Date</label>
              <input
                type="date"
                value={newWOD.date}
                onChange={(e) => setNewWOD({ ...newWOD, date: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-sm">Type</label>
              <select
                value={newWOD.type}
                onChange={(e) => setNewWOD({ ...newWOD, type: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
              >
                <option>For Time</option>
                <option>AMRAP</option>
                <option>EMOM</option>
                <option>Interval</option>
                <option>Chipper</option>
                <option>Strength</option>
                <option>Metcon</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-2 text-sm">Group</label>
              <select
                value={newWOD.group}
                onChange={(e) => setNewWOD({ ...newWOD, group: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
              >
                <option value="combined">Combined</option>
                <option value="mens">Men's</option>
                <option value="womens">Women's</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-slate-300 font-semibold text-sm">Movements</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={addSectionHeader}
                  className="text-slate-400 hover:text-slate-300 flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Section
                </button>
                <button
                  onClick={addMovement}
                  className="text-red-500 hover:text-red-400 flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {newWOD.movements.map((movement, index) => (
              movement.type === 'header' ? (
                <div key={index} className="border-l-4 border-amber-500 bg-slate-700/50 rounded-r-lg p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-xs font-bold uppercase tracking-wider">Section</span>
                    <input
                      type="text"
                      placeholder="e.g., Station 1 (4 min work, 1 min rest)"
                      value={movement.name}
                      onChange={(e) => updateMovement(index, 'name', e.target.value)}
                      className="flex-1 bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={() => removeMovement(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
              <div key={index} className="bg-slate-700 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="col-span-2 relative">
                      <input
                        type="text"
                        placeholder="Type to search movements..."
                        value={movementInput[index] || ''}
                        onChange={(e) => handleMovementInput(index, e.target.value)}
                        onFocus={() => {
                          if (movementInput[index]?.trim()) {
                            const updatedDropdown = [...showMovementDropdown];
                            updatedDropdown[index] = true;
                            setShowMovementDropdown(updatedDropdown);
                          }
                        }}
                        className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
                      />
                      {showMovementDropdown[index] && filteredMovements.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-600 border border-slate-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredMovements.slice(0, 10).map((mov, idx) => (
                            <div
                              key={idx}
                              onClick={() => selectMovement(index, mov)}
                              className="px-3 py-2 hover:bg-red-600 cursor-pointer text-white transition-colors text-sm"
                            >
                              {mov}
                            </div>
                          ))}
                          {!STANDARD_MOVEMENTS.includes(movementInput[index]) && movementInput[index]?.trim() && (
                            <div
                              onClick={() => {
                                const updatedDropdown = [...showMovementDropdown];
                                updatedDropdown[index] = false;
                                setShowMovementDropdown(updatedDropdown);
                              }}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 cursor-pointer text-white border-t border-slate-500 font-semibold transition-colors text-sm"
                            >
                              + Add "{movementInput[index]}" as custom
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Reps (e.g., 21-15-9)"
                      value={movement.reps}
                      onChange={(e) => updateMovement(index, 'reps', e.target.value)}
                      className="bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Notes (e.g., Rx: 95/65)"
                      value={movement.notes}
                      onChange={(e) => updateMovement(index, 'notes', e.target.value)}
                      className="bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
                    />
                  </div>
                  {newWOD.movements.length > 1 && (
                    <button
                      onClick={() => removeMovement(index)}
                      className="text-red-400 hover:text-red-300 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              )
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 mb-2 text-sm">Notes</label>
            <textarea
              placeholder="Additional workout notes..."
              value={newWOD.notes}
              onChange={(e) => setNewWOD({ ...newWOD, notes: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-20 text-sm"
            />
          </div>

          {/* WOD Board Photo */}
          <div className="mb-4">
            <label className="block text-slate-300 mb-2 text-sm">WOD Board Photo <span className="text-slate-500">(Optional)</span></label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2 text-sm">
                <Image className="w-4 h-4" />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleWodPhotoUpload}
                  className="hidden"
                />
              </label>
              <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2 text-sm">
                <Image className="w-4 h-4" />
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWodPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {wodPhotoData && (
              <div className="relative">
                <img
                  src={wodPhotoData}
                  alt="WOD Board"
                  className="w-full rounded-lg max-h-64 object-cover"
                />
                <button
                  onClick={() => setWodPhotoData(null)}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={postWOD}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {editingWOD ? 'Update WOD' : 'Post WOD'}
            </button>
            <button
              onClick={() => {
                setShowWODForm(false);
                setEditingWOD(null);
                setWodPhotoData(null);
                setSelectedCoach({ id: currentUser.id, name: currentUser.name });
                setNewWOD({
                  date: getLocalToday(),
                  type: 'For Time',
                  group: 'combined',
                  movements: [{ name: '', reps: '', notes: '' }],
                  notes: ''
                });
                setMovementInput(['']);
                setShowMovementDropdown([false]);
              }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
