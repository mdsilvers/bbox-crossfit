import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BBoxLogo from '../shared/BBoxLogo';
import ForgotPassword from './ForgotPassword';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ResetPasswordForm from './ResetPasswordForm';

export default function AuthScreen() {
  const { showForgotPassword, showResetPassword, showSignup } = useAuth();

  const renderForm = () => {
    if (showResetPassword) return <ResetPasswordForm />;
    if (showForgotPassword) return <ForgotPassword />;
    if (showSignup) return <SignupForm />;
    return <LoginForm />;
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-5 py-8 sm:px-6 md:px-8">
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10 border border-slate-700/50 shadow-2xl">
        <div className="text-center mb-10">
          <BBoxLogo className="w-28 h-14 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">CrossFit</h1>
          <p className="text-slate-400 text-base">Workout Logger</p>
        </div>

        {renderForm()}
      </div>
    </div>
  );
}
