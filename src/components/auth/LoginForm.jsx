import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginForm() {
  const {
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleLogin,
    authLoading,
    authError,
    authSuccess,
    setAuthError,
    setAuthSuccess,
    setShowSignup,
    setShowForgotPassword,
    setResetEmail,
  } = useAuth();

  return (
    <>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Login</h2>

      {/* Success Message */}
      {authSuccess && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-400 text-sm">{authSuccess}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {authError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-400 text-sm">{authError}</p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div>
          <label className="block text-slate-400 text-sm font-medium mb-2.5">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={loginEmail}
            onChange={(e) => {
              setLoginEmail(e.target.value);
              setAuthError('');
              setAuthSuccess('');
            }}
            className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-sm font-medium mb-2.5">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={loginPassword}
            onChange={(e) => {
              setLoginPassword(e.target.value);
              setAuthError('');
              setAuthSuccess('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
          />
          <div className="text-right mt-2">
            <button
              onClick={() => {
                setShowForgotPassword(true);
                setAuthError('');
                setAuthSuccess('');
                setResetEmail(loginEmail);
              }}
              className="text-red-500 hover:text-red-400 text-sm"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogin}
        disabled={authLoading}
        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl mt-8 mb-6 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25"
      >
        {authLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging in...
          </>
        ) : 'Login'}
      </button>

      <div className="text-center pt-2">
        <span className="text-slate-400 text-sm">Don't have an account? </span>
        <button
          onClick={() => {
            setShowSignup(true);
            setAuthError('');
            setAuthSuccess('');
          }}
          className="text-red-500 hover:text-red-400 text-sm font-semibold ml-1"
        >
          Sign Up
        </button>
      </div>
    </>
  );
}
