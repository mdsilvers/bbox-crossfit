import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, clearSupabaseStorage } from '../lib/supabase';
import * as db from '../lib/database';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState('athlete');
  const [signupGroup, setSignupGroup] = useState('mens');
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Initialize auth state listener
  useEffect(() => {
    let mounted = true;

    // Helper to load profile with timeout
    const loadProfile = async (userId) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout')), 10000)
      );
      const profile = await Promise.race([db.getProfile(userId), timeoutPromise]);
      return db.profileToUser(profile);
    };

    // Check for existing session
    const initAuth = async () => {
      try {
        const session = await db.getCurrentSession();
        if (session?.user && mounted) {
          const user = await loadProfile(session.user.id);
          if (mounted) setCurrentUser(user);
        }
      } catch (error) {
        // No session or expired — expected for logged-out users
        // Clear any stale session
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    };
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (mounted) setShowResetPassword(true);
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        try {
          const user = await loadProfile(session.user.id);
          if (mounted) setCurrentUser(user);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignup = async () => {
    setAuthError('');

    if (!signupEmail || !signupPassword || !signupName || !signupConfirmPassword) {
      setAuthError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (signupPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);

    try {
      await db.signUp(signupEmail, signupPassword, signupName, signupRole, signupGroup);
      setShowSignup(false);
      setAuthSuccess('Account created! Check your email and click the confirmation link to activate your account.');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupName('');
      setAuthError('');
    } catch (error) {
      console.error('Signup error:', error);
      if (error.message?.includes('already registered')) {
        setAuthError('An account with this email already exists');
      } else {
        setAuthError(error.message || 'Error creating account. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError('');
    setAuthSuccess('');

    if (!loginEmail || !loginPassword) {
      setAuthError('Please enter email and password');
      return;
    }

    setAuthLoading(true);

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timed out. Please try again.')), 15000)
      );
      await Promise.race([db.signIn(loginEmail, loginPassword), timeoutPromise]);
      setLoginEmail('');
      setLoginPassword('');
      setAuthError('');
    } catch (error) {
      console.error('Login error:', error);

      if (error.message?.includes('timed out') || error.message?.includes('406') || error.message?.includes('coerce')) {
        clearSupabaseStorage();
      }

      if (error.message?.includes('Invalid login') || error.message?.includes('invalid_credentials')) {
        setAuthError('Incorrect email or password. Please try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        setAuthError('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
      } else if (error.message?.includes('timed out')) {
        setAuthError('Login timed out. Session cleared - please try again.');
      } else if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('Invalid value')) {
        setAuthError('Unable to connect. Please check your internet connection and try again.');
      } else {
        setAuthError('Incorrect email or password. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await db.signOut();
      setCurrentUser(null);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleUpdatePassword = async () => {
    setAuthError('');
    setAuthSuccess('');

    if (!newPassword || !confirmNewPassword) {
      setAuthError('Please fill in both password fields');
      return;
    }

    if (newPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);

    try {
      await db.updatePassword(newPassword);
      setShowResetPassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setAuthSuccess('Password updated successfully! You can now log in with your new password.');
    } catch (error) {
      console.error('Password update error:', error);
      setAuthError(error.message || 'Error updating password. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError('');
    setAuthSuccess('');

    if (!resetEmail) {
      setAuthError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    setAuthLoading(true);

    try {
      await db.resetPassword(resetEmail);
      setAuthSuccess('Password reset email sent! Check your inbox and follow the link to reset your password.');
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      setAuthError(error.message || 'Error sending reset email. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    currentUser,
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    signupEmail, setSignupEmail,
    signupPassword, setSignupPassword,
    signupConfirmPassword, setSignupConfirmPassword,
    signupName, setSignupName,
    signupRole, setSignupRole,
    signupGroup, setSignupGroup,
    showSignup, setShowSignup,
    showForgotPassword, setShowForgotPassword,
    showResetPassword, setShowResetPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    resetEmail, setResetEmail,
    authError, setAuthError,
    authSuccess, setAuthSuccess,
    authLoading,
    handleSignup,
    handleLogin,
    handleLogout,
    handleForgotPassword,
    handleUpdatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
