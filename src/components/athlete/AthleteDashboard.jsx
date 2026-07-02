import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { LogOut, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContextValue';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useResults } from '../../hooks/useResults';
import { useBenchmarkPRs } from '../../hooks/useBenchmarkPRs';
import { useSocial } from '../../hooks/useSocial';
import { useBadges } from '../../hooks/useBadges';
import { useStrengthProgram } from '../../hooks/useStrengthProgram';
import { calculateStats } from '../../lib/stats';
import { shouldAdvanceStrengthSession } from '../../lib/workout-flow';
import BBoxLogo from '../shared/BBoxLogo';
import PhotoModal from '../shared/PhotoModal';
import PostWodSummary from '../shared/PostWodSummary';
import BadgeToast from '../social/BadgeToast';
import BadgeIcons from '../social/BadgeIcons';
import ActivityFeed from '../social/ActivityFeed';
import AthleteHomeDash from './AthleteHomeDash';
import AthleteHistoryView from './AthleteHistoryView';
import AthleteWorkoutView from './AthleteWorkoutView';

const ProgressDashboard = lazy(() => import('../ProgressDashboard'));

function LazyTabFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
}

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
    editingWorkout, setEditingWorkout,
    showDeleteConfirm, setShowDeleteConfirm,
    isCustomWorkout,
    customWod, setCustomWod,
    customMovementInput, setCustomMovementInput,
    showCustomMovementDropdown, setShowCustomMovementDropdown,
    customWodNameError, setCustomWodNameError,
    photoModalUrl, setPhotoModalUrl,
    postWodSummaryData, setPostWodSummaryData,
    showWorkoutSummary,
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
  } = useResults(currentUser);

  const { benchmarkPRs, setBenchmarkPRs, calculateBenchmarkPRs } = useBenchmarkPRs();

  const social = useSocial(currentUser);
  const badges = useBadges(currentUser);
  const strengthProgram = useStrengthProgram(currentUser);

  const [currentView, setCurrentView] = useState('dashboard');

  const navigate = useCallback((view) => {
    if (view !== 'workout') {
      setEditingWorkout(null);
    }
    setCurrentView(view);
  }, [setEditingWorkout]);

  // Data loading
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      // Phase 1: Minimum to render (2 parallel queries ~200ms)
      const [wod, program] = await Promise.all([
        loadTodayWOD(),
        strengthProgram.loadActiveProgram(),
      ]);

      // Phase 2: Today's result (1 query ~100ms)
      const results = await loadMyResults(wod, null);

      // Phase 3: Everything else in background (non-blocking).
      // Athletes don't need the full programs list — active program + enrollment is enough.
      Promise.all([
        loadAllWODs(),
        loadAllResults(),
        program ? strengthProgram.loadMyEnrollment(program.id) : Promise.resolve(),
        loadMissedWODs(results),
        badges.loadMyBadges(),
      ]).then(async ([wods]) => {
        const prs = calculateBenchmarkPRs(results, wods);
        setBenchmarkPRs(prs);
        await badges.checkAndAwardBadges(results, wods, prs);
        const resultIds = results.slice(0, 10).map(r => r.id);
        if (resultIds.length > 0) {
          social.loadReactionsForResults(resultIds);
          social.loadCommentsForResults(resultIds);
        }
      });
    };
    loadData();
  }, [currentUser]);

  const onLogout = async () => {
    await handleLogout();
  };

  const stats = useMemo(
    () => calculateStats(workoutResults, currentUser),
    [workoutResults, currentUser]
  );

  const handleResultSuccess = async (freshResults, logMeta) => {
    await loadMissedWODs(freshResults);
    const prs = calculateBenchmarkPRs(freshResults, allWODs);
    setBenchmarkPRs(prs);
    await badges.checkAndAwardBadges(freshResults, allWODs, prs);
    if (shouldAdvanceStrengthSession({
      activeProgram: strengthProgram.activeProgram,
      enrollment: strengthProgram.myEnrollment,
      todayWOD,
      wodId: logMeta?.wodId,
      isEdit: logMeta?.isEdit,
    })) {
      await strengthProgram.advanceMySession();
      await strengthProgram.loadMyEnrollment(strengthProgram.activeProgram?.id);
    }
  };

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
              data-testid="logout-button"
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
              allAthleteResults={allAthleteResults}
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
              showWorkoutSummary={(result) => showWorkoutSummary(result, allWODs)}
              activeProgram={strengthProgram.activeProgram}
              programSessions={strengthProgram.programSessions}
              myEnrollment={strengthProgram.myEnrollment}
              getMySession={strengthProgram.getMySession}
              getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
              onEnroll={(orm) => strengthProgram.enroll(strengthProgram.activeProgram.id, orm)}
              onUpdateOneRepMax={strengthProgram.updateMyOneRepMax}
            />
          )}

          {/* History View */}
          {currentView === 'history' && (
            <AthleteHistoryView
              workoutResults={workoutResults}
              allAthleteResults={allAthleteResults}
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
              showWorkoutSummary={(result) => showWorkoutSummary(result, allWODs)}
              activeProgram={strengthProgram.activeProgram}
              programSessions={strengthProgram.programSessions}
              myEnrollment={strengthProgram.myEnrollment}
            />
          )}

          {/* Progress View */}
          {currentView === 'progress' && (
            <Suspense fallback={<LazyTabFallback />}>
              <ProgressDashboard
                currentUser={currentUser}
                workoutResults={workoutResults}
                allAthleteResults={allAthleteResults}
                allWODs={allWODs}
              />
            </Suspense>
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
              activeProgram={strengthProgram.activeProgram}
              programSessions={strengthProgram.programSessions}
              myEnrollment={strengthProgram.myEnrollment}
              getMySession={strengthProgram.getMySession}
              getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
              advanceMySession={strengthProgram.advanceMySession}
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
              logResult={() => logResult(todayWOD, allWODs, handleResultSuccess)}
              logCustomWorkout={() => logCustomWorkout(allWODs, async (results) => {
                await loadMissedWODs(results);
                const prs = calculateBenchmarkPRs(results, allWODs);
                setBenchmarkPRs(prs);
                await badges.checkAndAwardBadges(results, allWODs, prs);
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

      {/* Post-WOD Summary Overlay */}
      {postWodSummaryData && (
        <PostWodSummary
          result={postWodSummaryData.result}
          wod={postWodSummaryData.wod}
          isUpdate={postWodSummaryData.isUpdate}
          isCustomWorkout={postWodSummaryData.isCustomWorkout}
          mode={postWodSummaryData.mode}
          currentUser={currentUser}
          reactions={social.reactions}
          onToggleReaction={social.toggleReaction}
          loadReactionsForResults={social.loadReactionsForResults}
          activeProgram={strengthProgram.activeProgram}
          enrollment={strengthProgram.myEnrollment}
          programSession={
            // Only override-pinned sessions are knowable here: enrollment has
            // already advanced past the session that was just logged
            postWodSummaryData.wod?.programSessionOverride
              ? strengthProgram.getMySession(postWodSummaryData.wod)
              : null
          }
          onDismiss={() => setPostWodSummaryData(null)}
        />
      )}
    </div>
  );
}
