import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useResults } from '../../hooks/useResults';
import { useBenchmarkPRs } from '../../hooks/useBenchmarkPRs';
import { calculateStats } from '../../lib/stats';
import BBoxLogo from '../shared/BBoxLogo';
import PhotoModal from '../shared/PhotoModal';
import ProgressDashboard from '../ProgressDashboard';
import AthleteHomeDash from './AthleteHomeDash';
import AthleteHistoryView from './AthleteHistoryView';
import AthleteWorkoutView from './AthleteWorkoutView';

export default function AthleteDashboard() {
  const { currentUser, handleLogout } = useAuth();
  const {
    allWODs,
    todayWOD,
    missedWODs,
    loadTodayWOD,
    loadAllWODs,
    loadMissedWODs,
  } = useWorkouts(currentUser);

  const {
    workoutResults,
    allAthleteResults,
    myResult, setMyResult,
    editingWorkout,
    showDeleteConfirm, setShowDeleteConfirm,
    isCustomWorkout,
    customWod, setCustomWod,
    customMovementInput, setCustomMovementInput,
    showCustomMovementDropdown, setShowCustomMovementDropdown,
    customWodNameError, setCustomWodNameError,
    photoModalUrl, setPhotoModalUrl,
    loadMyResults,
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
  } = useResults(currentUser);

  const { benchmarkPRs, setBenchmarkPRs, calculateBenchmarkPRs } = useBenchmarkPRs();

  const [currentView, setCurrentView] = useState('dashboard');

  const navigate = (view) => setCurrentView(view);

  // Data loading
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      const wod = await loadTodayWOD();
      const results = await loadMyResults(wod, null);
      await loadMissedWODs(results, workoutResults);
      const wods = await loadAllWODs();
      const prs = calculateBenchmarkPRs(results, wods);
      setBenchmarkPRs(prs);
    };
    loadData();
  }, [currentUser]);

  const onLogout = async () => {
    await handleLogout();
  };

  const stats = calculateStats(workoutResults, currentUser);

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto pb-8">
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

        {/* Main Content */}
        <div className="px-4 pt-3 pb-4">
          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                currentView === 'dashboard'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('workout')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                currentView === 'workout'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Today's WOD
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                currentView === 'history'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setCurrentView('progress')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                currentView === 'progress'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Progress
            </button>
          </div>

          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <AthleteHomeDash
              currentUser={currentUser}
              stats={stats}
              benchmarkPRs={benchmarkPRs}
              todayWOD={todayWOD}
              missedWODs={missedWODs}
              workoutResults={workoutResults}
              allWODs={allWODs}
              myResult={myResult}
              startLogMissedWOD={(wod) => startLogMissedWOD(wod, navigate)}
              startCustomWorkout={() => startCustomWorkout(navigate)}
              editPastWorkout={(result) => editPastWorkout(result, navigate)}
              deleteWorkout={deleteWorkout}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              photoModalUrl={photoModalUrl}
              setPhotoModalUrl={setPhotoModalUrl}
              navigate={navigate}
            />
          )}

          {/* History View */}
          {currentView === 'history' && (
            <AthleteHistoryView
              workoutResults={workoutResults}
              allWODs={allWODs}
              currentUser={currentUser}
              todayWOD={todayWOD}
              editPastWorkout={(result) => editPastWorkout(result, navigate)}
              deleteWorkout={deleteWorkout}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              photoModalUrl={photoModalUrl}
              setPhotoModalUrl={setPhotoModalUrl}
              navigate={navigate}
            />
          )}

          {/* Progress View */}
          {currentView === 'progress' && (
            <ProgressDashboard
              currentUser={currentUser}
              workoutResults={workoutResults}
              allAthleteResults={allAthleteResults}
              allWODs={allWODs}
            />
          )}

          {/* Workout View */}
          {currentView === 'workout' && (
            <AthleteWorkoutView
              todayWOD={todayWOD}
              myResult={myResult}
              setMyResult={setMyResult}
              editingWorkout={editingWorkout}
              isCustomWorkout={isCustomWorkout}
              customWod={customWod}
              setCustomWod={setCustomWod}
              customMovementInput={customMovementInput}
              setCustomMovementInput={setCustomMovementInput}
              showCustomMovementDropdown={showCustomMovementDropdown}
              setShowCustomMovementDropdown={setShowCustomMovementDropdown}
              customWodNameError={customWodNameError}
              setCustomWodNameError={setCustomWodNameError}
              allWODs={allWODs}
              logResult={() => logResult(todayWOD, allWODs, async (results) => {
                await loadMissedWODs(results, workoutResults);
                const prs = calculateBenchmarkPRs(results, allWODs);
                setBenchmarkPRs(prs);
              })}
              logCustomWorkout={() => logCustomWorkout(allWODs, async (results) => {
                await loadMissedWODs(results, workoutResults);
                const prs = calculateBenchmarkPRs(results, allWODs);
                setBenchmarkPRs(prs);
                navigate('dashboard');
              })}
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
              navigate={navigate}
            />
          )}
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal url={photoModalUrl} onClose={() => setPhotoModalUrl(null)} />
    </div>
  );
}
