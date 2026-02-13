import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordForm() {
  const {
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    handleUpdatePassword,
    authLoading,
    authError,
    setAuthError,
  } = useAuth();

  return (
    <>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Set New Password</h2>

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

      <p className="text-slate-400 text-sm mb-6">
        Enter your new password below.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-slate-400 text-sm font-medium mb-2.5">New Password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setAuthError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
            className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
          />
          {newPassword && newPassword.length < 6 && (
            <p className="text-yellow-400 text-xs mt-1.5">Password must be at least 6 characters</p>
          )}
        </div>

        <div>
          <label className="block text-slate-400 text-sm font-medium mb-2.5">Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm your new password"
            value={confirmNewPassword}
            onChange={(e) => {
              setConfirmNewPassword(e.target.value);
              setAuthError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
            className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
          />
          {confirmNewPassword && newPassword !== confirmNewPassword && (
            <p className="text-yellow-400 text-xs mt-1.5">Passwords do not match</p>
          )}
          {confirmNewPassword && newPassword === confirmNewPassword && newPassword.length >= 6 && (
            <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Passwords match
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleUpdatePassword}
        disabled={authLoading}
        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl mt-10 mb-6 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25"
      >
        {authLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Updating...
          </>
        ) : 'Update Password'}
      </button>
    </>
  );
}
