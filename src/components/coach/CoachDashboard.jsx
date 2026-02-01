import React, { useState, useEffect } from 'react';
import { LogOut, Clock, Calendar, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useResults } from '../../hooks/useResults';
import { useBenchmarkPRs } from '../../hooks/useBenchmarkPRs';
import { calculateStats } from '../../lib/stats';
import BBoxLogo from '../shared/BBoxLogo';
import PhotoModal from '../shared/PhotoModal';
import CoachHomeDash from './CoachHomeDash';
import CoachHistoryView from './CoachHistoryView';
import CoachWorkoutView from './CoachWorkoutView';
import CoachProgramView from './CoachProgramView';
import CoachAthleteList from './CoachAthleteList';
import ProgressDashboard from '../ProgressDashboard';

export default function CoachDashboard() {
  const { currentUser, handleLogout } = useAuth();
  const [coachView, setCoachView] = useState('dashboard');

  const workouts = useWorkouts(currentUser);
  const results = useResults(currentUser);
  const { benchmarkPRs, setBenchmarkPRs, calculateBenchmarkPRs } = useBenchmarkPRs();

  const {
    allWODs,
    todayWOD,
    missedWODs,
    showWODForm, setShowWODForm,
    newWOD, setNewWOD,
    movementInput, setMovementInput,
    showMovementDropdown, setShowMovementDropdown,
    filteredMovements,
    editingWOD, setEditingWOD,
    showDeleteWODConfirm, setShowDeleteWODConfirm,
    loadTodayWOD,
    loadAllWODs,
    loadMissedWODs,
    postWOD,
    editWOD,
    deleteWOD,
    confirmDeleteWOD,
    addMovement,
    updateMovement,
    handleMovementInput,
    selectMovement,
    removeMovement,
  } = workouts;

  const {
    workoutResults,
    allAthleteResults,
    myResult, setMyResult,
    editingWorkout, setEditingWorkout,
    showDeleteConfirm, setShowDeleteConfirm,
    isCustomWorkout,
    customWod, setCustomWod,
    customMovementInput, setCustomMovementInput,
    showCustomMovementDropdown, setShowCustomMovementDropdown,
    customWodNameError, setCustomWodNameError,
    photoModalUrl, setPhotoModalUrl,
    loadMyResults,
    loadAllResults,
    logResult,
    logCustomWorkout,
    startLogMissedWOD,
    startCustomWorkout,
    cancelCustomWorkout,
    editPastWorkout,
    deleteWorkout,
    cancelEdit,
    handlePhotoUpload,
    updateMovementWeight,
    addCustomMovement,
    removeCustomMovement,
    updateCustomMovement,
    handleCustomMovementInput,
    selectCustomMovement,
  } = results;

  // Navigation function passed to children and hook callbacks
  const navigate = (view) => setCoachView(view);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      const wod = await loadTodayWOD();
      const myResults = await loadMyResults(wod, null);
      await loadMissedWODs(myResults, workoutResults);
      const wods = await loadAllWODs();
      const prs = calculateBenchmarkPRs(myResults, wods);
      setBenchmarkPRs(prs);
      loadAllResults();
    };
    loadData();
  }, [currentUser]);

  const stats = calculateStats(workoutResults, currentUser);

  // Wrapper for logout that resets app-level state
  const onLogout = async () => {
    await handleLogout();
  };

  // Callback after result logging to recalculate PRs and refresh missed WODs
  const handleResultSuccess = async (freshResults) => {
    await loadMissedWODs(freshResults, workoutResults);
    const prs = calculateBenchmarkPRs(freshResults, allWODs);
    setBenchmarkPRs(prs);
    navigate('dashboard');
  };

  // Callback after custom workout logging
  const handleCustomSuccess = async (freshResults) => {
    await loadMissedWODs(freshResults, workoutResults);
    const prs = calculateBenchmarkPRs(freshResults, allWODs);
    setBenchmarkPRs(prs);
    navigate('dashboard');
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 z-10 px-4 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BBoxLogo className="w-14 h-7" />
              <h1 className="text-xl font-semibold text-white">{currentUser.name}</h1>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-white p-2"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 py-4">
          {/* Dashboard View */}
          {coachView === 'dashboard' && (
            <CoachHomeDash
              currentUser={currentUser}
              stats={stats}
              benchmarkPRs={benchmarkPRs}
              todayWOD={todayWOD}
              missedWODs={missedWODs}
              workoutResults={workoutResults}
              allAthleteResults={allAthleteResults}
              allWODs={allWODs}
              myResult={myResult}
              startLogMissedWOD={(wod) => startLogMissedWOD(wod, navigate)}
              startCustomWorkout={() => startCustomWorkout(navigate)}
              editPastWorkout={(result) => {
                editPastWorkout(result);
                navigate('workout');
              }}
              deleteWorkout={deleteWorkout}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              photoModalUrl={photoModalUrl}
              setPhotoModalUrl={setPhotoModalUrl}
              navigate={navigate}
              editWOD={(wod) => editWOD(wod, navigate)}
            />
          )}

          {/* History View */}
          {coachView === 'history' && (
            <CoachHistoryView
              workoutResults={workoutResults}
              allWODs={allWODs}
              allAthleteResults={allAthleteResults}
              currentUser={currentUser}
              editPastWorkout={(result) => {
                editPastWorkout(result);
                navigate('workout');
              }}
              deleteWorkout={deleteWorkout}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              photoModalUrl={photoModalUrl}
              setPhotoModalUrl={setPhotoModalUrl}
              navigate={navigate}
            />
          )}

          {/* Workout View */}
          {coachView === 'workout' && (
            <CoachWorkoutView
              currentUser={currentUser}
              todayWOD={todayWOD}
              myResult={myResult}
              setMyResult={setMyResult}
              editingWorkout={editingWorkout}
              isCustomWorkout={isCustomWorkout}
              customWod={customWod}
              setCustomWod={setCustomWod}
              customMovementInput={customMovementInput}
              showCustomMovementDropdown={showCustomMovementDropdown}
              customWodNameError={customWodNameError}
              setCustomWodNameError={setCustomWodNameError}
              allWODs={allWODs}
              logResult={() => logResult(todayWOD, allWODs, handleResultSuccess)}
              logCustomWorkout={() => logCustomWorkout(allWODs, handleCustomSuccess)}
              startCustomWorkout={() => startCustomWorkout(navigate)}
              cancelCustomWorkout={() => cancelCustomWorkout(navigate)}
              cancelEdit={() => cancelEdit(todayWOD, navigate)}
              handlePhotoUpload={handlePhotoUpload}
              updateMovementWeight={updateMovementWeight}
              addCustomMovement={addCustomMovement}
              removeCustomMovement={removeCustomMovement}
              updateCustomMovement={updateCustomMovement}
              handleCustomMovementInput={handleCustomMovementInput}
              selectCustomMovement={selectCustomMovement}
              photoModalUrl={photoModalUrl}
              setPhotoModalUrl={setPhotoModalUrl}
            />
          )}

          {/* Program View */}
          {coachView === 'program' && (
            <CoachProgramView
              currentUser={currentUser}
              allWODs={allWODs}
              workoutResults={workoutResults}
              allAthleteResults={allAthleteResults}
              showWODForm={showWODForm}
              setShowWODForm={setShowWODForm}
              newWOD={newWOD}
              setNewWOD={setNewWOD}
              movementInput={movementInput}
              setMovementInput={setMovementInput}
              showMovementDropdown={showMovementDropdown}
              setShowMovementDropdown={setShowMovementDropdown}
              filteredMovements={filteredMovements}
              editingWOD={editingWOD}
              setEditingWOD={setEditingWOD}
              showDeleteWODConfirm={showDeleteWODConfirm}
              setShowDeleteWODConfirm={setShowDeleteWODConfirm}
              postWOD={() => postWOD(() => loadMyResults())}
              editWOD={(wod) => editWOD(wod, navigate)}
              deleteWOD={(wod) => deleteWOD(wod, allAthleteResults)}
              confirmDeleteWOD={() => confirmDeleteWOD(workoutResults, async () => {
                await loadMyResults();
                await loadAllResults();
              })}
              addMovement={addMovement}
              updateMovement={updateMovement}
              handleMovementInput={handleMovementInput}
              selectMovement={selectMovement}
              removeMovement={removeMovement}
            />
          )}

          {/* Progress View */}
          {coachView === 'progress' && (
            <ProgressDashboard
              currentUser={currentUser}
              workoutResults={workoutResults}
              allAthleteResults={allAthleteResults}
              allWODs={allWODs}
            />
          )}

          {/* Athletes View */}
          {coachView === 'athletes' && (
            <CoachAthleteList
              allAthleteResults={allAthleteResults}
              allWODs={allWODs}
              currentUser={currentUser}
              photoModalUrl={photoModalUrl}
              setPhotoModalUrl={setPhotoModalUrl}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 safe-area-inset-bottom">
          <div className="max-w-2xl mx-auto grid grid-cols-5 text-center">
            <button
              onClick={() => setCoachView('dashboard')}
              className={`py-3 flex flex-col items-center gap-1 ${
                coachView === 'dashboard' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => setCoachView('history')}
              className={`py-3 flex flex-col items-center gap-1 ${
                coachView === 'history' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <Clock className="w-6 h-6" />
              <span className="text-xs">History</span>
            </button>
            <button
              onClick={() => setCoachView('progress')}
              className={`py-3 flex flex-col items-center gap-1 ${
                coachView === 'progress' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs">Progress</span>
            </button>
            <button
              onClick={() => setCoachView('program')}
              className={`py-3 flex flex-col items-center gap-1 ${
                coachView === 'program' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs">Program</span>
            </button>
            <button
              onClick={() => setCoachView('athletes')}
              className={`py-3 flex flex-col items-center gap-1 ${
                coachView === 'athletes' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Athletes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal url={photoModalUrl} onClose={() => setPhotoModalUrl(null)} />
    </div>
  );
}
