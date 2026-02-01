import React, { useState, useEffect } from 'react';
import { LogOut, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useResults } from '../../hooks/useResults';
import { useBenchmarkPRs } from '../../hooks/useBenchmarkPRs';
import { useSocial } from '../../hooks/useSocial';
import { useBadges } from '../../hooks/useBadges';
import { calculateStats } from '../../lib/stats';
import BBoxLogo from '../shared/BBoxLogo';
import PhotoModal from '../shared/PhotoModal';
import BadgeToast from '../social/BadgeToast';
import BadgeIcons from '../social/BadgeIcons';
import ProgressDashboard from '../ProgressDashboard';
import ActivityFeed from '../social/ActivityFeed';
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

  const social = useSocial(currentUser);
  const badges = useBadges(currentUser);

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
      await badges.loadMyBadges();
      await badges.checkAndAwardBadges(results, wods, prs);
      // Load social data for recent results
      const resultIds = results.slice(0, 10).map(r => r.id);
      if (resultIds.length > 0) {
        await social.loadReactionsForResults(resultIds);
        await social.loadCommentsForResults(resultIds);
      }
    };
    loadData();
  }, [currentUser]);

  const onLogout = async () => {
    await handleLogout();
  };

  const stats = calculateStats(workoutResults, currentUser);

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 z-10 px-4 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BBoxLogo className="w-14 h-7" />
              <div>
                <h1 className="text-xl font-semibold text-white">{currentUser.name}</h1>
                <BadgeIcons earnedBadgeKeys={badges.myBadges} size="xs" />
              </div>
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
        <div className="px-4 py-4">

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
              reactions={social.reactions}
              comments={social.comments}
              onToggleReaction={social.toggleReaction}
              onPostComment={social.postComment}
              onDeleteComment={social.removeComment}
              loadReactionsForResults={social.loadReactionsForResults}
              myBadges={badges.myBadges}
              streakWeeks={badges.streakWeeks}
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
              reactions={social.reactions}
              comments={social.comments}
              onToggleReaction={social.toggleReaction}
              onPostComment={social.postComment}
              onDeleteComment={social.removeComment}
              loadReactionsForResults={social.loadReactionsForResults}
              loadCommentsForResults={social.loadCommentsForResults}
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

          {/* Activity Feed View */}
          {currentView === 'feed' && (
            <ActivityFeed
              currentUser={currentUser}
              allWODs={allWODs}
              reactions={social.reactions}
              onToggleReaction={social.toggleReaction}
              loadReactionsForResults={social.loadReactionsForResults}
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
                await badges.checkAndAwardBadges(results, allWODs, prs);
              })}
              logCustomWorkout={() => logCustomWorkout(allWODs, async (results) => {
                await loadMissedWODs(results, workoutResults);
                const prs = calculateBenchmarkPRs(results, allWODs);
                setBenchmarkPRs(prs);
                await badges.checkAndAwardBadges(results, allWODs, prs);
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

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 safe-area-inset-bottom">
          <div className="max-w-2xl mx-auto grid grid-cols-3 text-center">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-3 flex flex-col items-center gap-1 ${
                currentView === 'dashboard' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`py-3 flex flex-col items-center gap-1 ${
                currentView === 'history' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <Clock className="w-6 h-6" />
              <span className="text-xs">History</span>
            </button>
            <button
              onClick={() => setCurrentView('progress')}
              className={`py-3 flex flex-col items-center gap-1 ${
                currentView === 'progress' ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs">Progress</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal url={photoModalUrl} onClose={() => setPhotoModalUrl(null)} />

      {/* Badge Toast */}
      <BadgeToast badge={badges.newBadgeToast} onDismiss={badges.dismissToast} />
    </div>
  );
}
