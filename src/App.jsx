import React from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen';
import CoachDashboard from './components/coach/CoachDashboard';
import AthleteDashboard from './components/athlete/AthleteDashboard';

export default function App() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <AuthScreen />;
  }

  if (currentUser.role === 'coach') {
    return <CoachDashboard />;
  }

  return <AthleteDashboard />;
}
