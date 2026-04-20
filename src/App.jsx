import React, { lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen';
import BBoxLogo from './components/shared/BBoxLogo';

const CoachDashboard = lazy(() => import('./components/coach/CoachDashboard'));
const AthleteDashboard = lazy(() => import('./components/athlete/AthleteDashboard'));

function SplashScreen() {
  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <BBoxLogo className="w-28 h-14 mx-auto mb-4" />
        <div className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { currentUser, authInitializing } = useAuth();

  if (authInitializing) return <SplashScreen />;
  if (!currentUser) return <AuthScreen />;

  return (
    <Suspense fallback={<SplashScreen />}>
      {currentUser.role === 'coach' ? <CoachDashboard /> : <AthleteDashboard />}
    </Suspense>
  );
}
