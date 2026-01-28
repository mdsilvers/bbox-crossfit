import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Dumbbell, Clock, Calendar, Users, Image, LogOut, UserCircle } from 'lucide-react';
import { supabase, clearSupabaseStorage } from './lib/supabase';
import * as db from './lib/database';

// Standard CrossFit movements list
const STANDARD_MOVEMENTS = [
  // Gymnastics
  'Air Squat', 'Pull-up', 'Push-up', 'Sit-up', 'Ring Dip', 'Muscle-up',
  'Bar Muscle-up', 'Ring Muscle-up', 'Handstand Push-up', 'Strict Handstand Push-up',
  'Kipping Handstand Push-up', 'Pistol', 'Toes-to-Bar', 'Knees-to-Elbow',
  'Chest-to-Bar Pull-up', 'Butterfly Pull-up', 'Strict Pull-up', 'L-Sit',
  'Rope Climb', 'Legless Rope Climb', 'Burpee', 'Burpee Box Jump', 'Burpee Pull-up',
  'Box Jump', 'Box Jump Over', 'Box Step-up', 'Jumping Lunge', 'Walking Lunge',
  
  // Olympic Weightlifting
  'Snatch', 'Power Snatch', 'Squat Snatch', 'Hang Snatch', 'Hang Power Snatch',
  'Clean', 'Power Clean', 'Squat Clean', 'Hang Clean', 'Hang Power Clean',
  'Clean and Jerk', 'Jerk', 'Push Jerk', 'Split Jerk', 'Overhead Squat',
  
  // Barbell
  'Deadlift', 'Sumo Deadlift High Pull', 'Thruster', 'Front Squat', 'Back Squat',
  'Overhead Squat', 'Bench Press', 'Strict Press', 'Push Press', 'Good Morning',
  'Pendlay Row', 'Bent-Over Row', 'Romanian Deadlift', 'Hang Clean Pull',
  
  // Dumbbell/Kettlebell
  'Dumbbell Snatch', 'Dumbbell Clean', 'Dumbbell Thruster', 'Devil Press',
  'Dumbbell Box Step-up', 'Kettlebell Swing', 'American Kettlebell Swing',
  'Russian Kettlebell Swing', 'Kettlebell Snatch', 'Goblet Squat',
  'Turkish Get-up', 'Single-Arm Dumbbell Row',
  
  // Monostructural/Cardio
  'Run', 'Row', 'Bike', 'Assault Bike', 'Echo Bike', 'Ski Erg', 'Jump Rope',
  'Double Under', 'Single Under', 'Triple Under', 'Swimming',
  
  // Other
  'Wall Ball', 'Medicine Ball Clean', 'GHD Sit-up', 'Back Extension',
  'Hip Extension', 'Slam Ball', 'Sandbag Carry', 'Farmer Carry',
  'Sled Push', 'Sled Pull', 'Yoke Carry'
].sort();

// BBOX Logo Component with hosted image
const BBoxLogo = ({ className = "w-10 h-10" }) => (
  <img 
    src="https://www.antarescatamarans.com/wp-content/uploads/2026/01/BBOX-New-BarBell-smallest.png"
    alt="BBOX CrossFit"
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export default function CrossFitBoxApp() {
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
  const [resetEmail, setResetEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Coach state
  const [showWODForm, setShowWODForm] = useState(false);
  const [newWOD, setNewWOD] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: 'For Time',
    group: 'combined',
    movements: [{ name: '', reps: '', notes: '' }],
    notes: ''
  });
  const [movementInput, setMovementInput] = useState(['']);
  const [showMovementDropdown, setShowMovementDropdown] = useState([false]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [coachView, setCoachView] = useState('dashboard'); // 'dashboard', 'workout', 'program', 'athletes'
  const [allWODs, setAllWODs] = useState([]);
  const [editingWOD, setEditingWOD] = useState(null);
  const [showDeleteWODConfirm, setShowDeleteWODConfirm] = useState(null);
  const [expandedAthlete, setExpandedAthlete] = useState(null);

  // Athlete state
  const [todayWOD, setTodayWOD] = useState(null);
  const [myResult, setMyResult] = useState({
    time: '',
    movements: [],
    notes: '',
    photoData: null
  });
  const [workoutResults, setWorkoutResults] = useState([]); // Current user's results
  const [allAthleteResults, setAllAthleteResults] = useState([]); // All results (for coaches)
  const [missedWODs, setMissedWODs] = useState([]); // WODs from past days user hasn't logged
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'workout', or 'history'
  const [editingWorkout, setEditingWorkout] = useState(null); // For editing past workouts
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [coachHistorySearch, setCoachHistorySearch] = useState('');
  const [photoModalUrl, setPhotoModalUrl] = useState(null); // For viewing photos in full screen

  // Custom workout state (for athletes creating their own workouts)
  const [isCustomWorkout, setIsCustomWorkout] = useState(false);
  const [customWod, setCustomWod] = useState({
    name: '',
    type: 'For Time',
    movements: [{ name: '', reps: '', notes: '' }]
  });
  const [customMovementInput, setCustomMovementInput] = useState(['']);
  const [showCustomMovementDropdown, setShowCustomMovementDropdown] = useState([false]);

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
        console.log('No user logged in or session expired:', error.message);
        // Clear any stale session
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    };
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      // Load WOD first, then results (to avoid race condition)
      const wod = await loadTodayWOD();
      const results = await loadMyResults(wod);

      // Load missed WODs (WODs from past days user hasn't logged)
      await loadMissedWODs(results);

      if (currentUser.role === 'coach') {
        loadAllResults();
        loadAllWODs();
      }
    };
    loadData();
  }, [currentUser]);

  const handleSignup = async () => {
    setAuthError('');

    // Validate all fields
    if (!signupEmail || !signupPassword || !signupName || !signupConfirmPassword) {
      setAuthError('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    // Validate password length
    if (signupPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    // Validate password match
    if (signupPassword !== signupConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);

    try {
      await db.signUp(signupEmail, signupPassword, signupName, signupRole, signupGroup);
      // Show success message and switch to login view
      setShowSignup(false);
      setAuthSuccess('Account created! Check your email and click the confirmation link to activate your account.');
      // Clear form
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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timed out. Please try again.')), 15000)
      );
      await Promise.race([db.signIn(loginEmail, loginPassword), timeoutPromise]);
      // Auth state listener will handle setting currentUser
      setLoginEmail('');
      setLoginPassword('');
      setAuthError('');
    } catch (error) {
      console.error('Login error:', error);

      // Clear corrupted session data on timeout or unexpected errors
      if (error.message?.includes('timed out') || error.message?.includes('406') || error.message?.includes('coerce')) {
        clearSupabaseStorage();
      }

      if (error.message?.includes('Invalid login')) {
        setAuthError('Incorrect email or password. Please try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        setAuthError('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
      } else if (error.message?.includes('timed out')) {
        setAuthError('Login timed out. Session cleared - please try again.');
      } else {
        setAuthError(error.message || 'Error logging in. Please try again.');
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
      // Reset state
      setAllWODs([]);
      setTodayWOD(null);
      setWorkoutResults([]);
      setAllAthleteResults([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError('');
    setAuthSuccess('');

    if (!resetEmail) {
      setAuthError('Please enter your email address');
      return;
    }

    // Validate email format
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

  // Coach functions
  const addMovement = () => {
    setNewWOD({
      ...newWOD,
      movements: [...newWOD.movements, { name: '', reps: '', notes: '' }]
    });
    setMovementInput([...movementInput, '']);
    setShowMovementDropdown([...showMovementDropdown, false]);
  };

  const updateMovement = (index, field, value) => {
    const updated = [...newWOD.movements];
    updated[index][field] = value;
    setNewWOD({ ...newWOD, movements: updated });
  };

  const handleMovementInput = (index, value) => {
    const updatedInput = [...movementInput];
    updatedInput[index] = value;
    setMovementInput(updatedInput);

    // Filter movements
    if (value.trim()) {
      const filtered = STANDARD_MOVEMENTS.filter(m =>
        m.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredMovements(filtered);
      
      const updatedDropdown = [...showMovementDropdown];
      updatedDropdown[index] = true;
      setShowMovementDropdown(updatedDropdown);
    } else {
      const updatedDropdown = [...showMovementDropdown];
      updatedDropdown[index] = false;
      setShowMovementDropdown(updatedDropdown);
    }

    // Update the actual movement name
    updateMovement(index, 'name', value);
  };

  const selectMovement = (index, movementName) => {
    const updatedInput = [...movementInput];
    updatedInput[index] = movementName;
    setMovementInput(updatedInput);

    updateMovement(index, 'name', movementName);

    const updatedDropdown = [...showMovementDropdown];
    updatedDropdown[index] = false;
    setShowMovementDropdown(updatedDropdown);
  };

  const removeMovement = (index) => {
    const updated = newWOD.movements.filter((_, i) => i !== index);
    setNewWOD({ ...newWOD, movements: updated });
    
    const updatedInput = movementInput.filter((_, i) => i !== index);
    setMovementInput(updatedInput);
    
    const updatedDropdown = showMovementDropdown.filter((_, i) => i !== index);
    setShowMovementDropdown(updatedDropdown);
  };

  const postWOD = async () => {
    if (!newWOD.movements[0].name) {
      alert('Please add at least one movement');
      return;
    }

    try {
      // Check for conflicts
      const conflictCheck = await db.checkWodConflict(newWOD.date, newWOD.group, editingWOD?.id);
      if (conflictCheck.conflict) {
        alert(conflictCheck.message);
        return;
      }

      if (editingWOD) {
        await db.updateWod(editingWOD.id, newWOD);
      } else {
        await db.createWod(newWOD, currentUser.id, currentUser.name);
      }

      const action = editingWOD ? 'updated' : 'posted';
      alert(`WOD ${action} successfully!`);
      setShowWODForm(false);
      setEditingWOD(null);
      setNewWOD({
        name: '',
        date: new Date().toISOString().split('T')[0],
        type: 'For Time',
        group: 'combined',
        movements: [{ name: '', reps: '', notes: '' }],
        notes: ''
      });
      setMovementInput(['']);
      setShowMovementDropdown([false]);
      await loadAllWODs();
      await loadTodayWOD();
    } catch (error) {
      alert('Error posting WOD: ' + error.message);
    }
  };

  // Athlete functions
  const loadTodayWOD = async () => {
    if (!currentUser) return null;

    try {
      const wodData = await db.getTodayWod(currentUser.group);
      if (wodData) {
        const wod = db.wodToAppFormat(wodData);
        setTodayWOD(wod);
        return wod; // Return the WOD so caller can use it
      } else {
        setTodayWOD(null);
        return null;
      }
    } catch {
      console.log('No WOD posted for today');
      setTodayWOD(null);
      return null;
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMyResult({ ...myResult, photoData: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const logResult = async () => {
    if (!todayWOD && !editingWorkout) return;

    const workoutDate = editingWorkout ? editingWorkout.date : todayWOD.date;

    const resultData = {
      wodId: editingWorkout?.wodId || todayWOD?.id,
      date: workoutDate,
      time: myResult.time,
      movements: myResult.movements,
      notes: myResult.notes,
      photoData: myResult.photoData,
    };

    try {
      if (myResult.existingResultId) {
        // Update existing result
        await db.updateResult(myResult.existingResultId, resultData);
        alert('Workout updated! Great job!');
      } else {
        // Create new result
        await db.createResult(resultData, currentUser.id, currentUser.name, currentUser.email);
        alert('Workout logged! Great job!');
      }

      const results = await loadMyResults();
      await loadMissedWODs(results); // Refresh missed WODs list

      if (currentUser.role === 'coach') {
        await loadAllResults();
      }

      // If logging a missed WOD, go back to dashboard
      if (editingWorkout) {
        setEditingWorkout(null);
        setCurrentView('dashboard');
        if (currentUser.role === 'coach') {
          setCoachView('dashboard');
        }
      }
    } catch (error) {
      alert('Error logging workout: ' + error.message);
    }
  };

  const loadMyResults = async (wod = null) => {
    if (!currentUser) return [];

    // Use passed WOD or fall back to state
    const currentWOD = wod || todayWOD;

    try {
      const resultsData = await db.getResultsByAthlete(currentUser.id);
      const myResults = resultsData.map(r => db.resultToAppFormat(r));
      setWorkoutResults(myResults);

      // Check if already logged today's workout BY DATE, not by WOD ID
      const today = new Date().toISOString().split('T')[0];
      const todayResult = myResults.find(r => r.date === today);

      if (todayResult) {
        // User has already logged today - preserve their existing data
        setMyResult({
          time: todayResult.time,
          movements: todayResult.movements,
          notes: todayResult.notes,
          photoData: todayResult.photoData,
          existingResultId: todayResult.id
        });
      } else if (currentWOD) {
        // No result for today yet - initialize with WOD template
        setMyResult({
          time: '',
          movements: currentWOD.movements.map(m => ({ ...m, weight: '' })),
          notes: '',
          photoData: null
        });
      }

      return myResults; // Return results for use by caller
    } catch (error) {
      console.log('No results yet', error);
      return [];
    }
  };

  const loadAllResults = async () => {
    if (currentUser?.role !== 'coach') return;

    try {
      const resultsData = await db.getAllResults();
      const allResults = resultsData.map(r => db.resultToAppFormat(r));
      setAllAthleteResults(allResults);
    } catch (error) {
      console.log('Error loading results:', error);
      setAllAthleteResults([]);
    }
  };

  const loadAllWODs = async () => {
    try {
      const wodsData = await db.getAllWods();
      const wods = wodsData.map(w => db.wodToAppFormat(w));
      setAllWODs(wods);
    } catch (error) {
      console.log('Error loading WODs:', error);
      setAllWODs([]);
    }
  };

  const loadMissedWODs = async (userResults = null) => {
    if (!currentUser) return;

    try {
      // Get recent WODs (past 7 days, excluding today)
      const recentWodsData = await db.getRecentWods(currentUser.group, 7);
      const recentWods = recentWodsData.map(w => db.wodToAppFormat(w));

      // Get user's results to filter out already logged WODs
      const results = userResults || workoutResults;
      const loggedDates = new Set(results.map(r => r.date));

      // Filter to only WODs the user hasn't logged
      const missed = recentWods.filter(wod => !loggedDates.has(wod.date));
      setMissedWODs(missed);
    } catch (error) {
      console.log('Error loading missed WODs:', error);
      setMissedWODs([]);
    }
  };

  const startLogMissedWOD = (wod) => {
    // Set up the workout for logging
    setEditingWorkout({
      ...wod,
      movements: wod.movements
    });
    setMyResult({
      time: '',
      movements: wod.movements.map(m => ({ ...m, weight: '' })),
      notes: '',
      photoData: null
    });
    setIsCustomWorkout(false);
    setCurrentView('workout');
    // Also update coach view if applicable
    if (currentUser.role === 'coach') {
      setCoachView('workout');
    }
  };

  // Custom workout functions for athletes
  const startCustomWorkout = () => {
    setIsCustomWorkout(true);
    setEditingWorkout(null);
    setCustomWod({
      name: '',
      type: 'For Time',
      movements: [{ name: '', reps: '', notes: '' }]
    });
    setCustomMovementInput(['']);
    setShowCustomMovementDropdown([false]);
    setMyResult({
      time: '',
      movements: [],
      notes: '',
      photoData: null
    });
    setCurrentView('workout');
    if (currentUser.role === 'coach') {
      setCoachView('workout');
    }
  };

  const cancelCustomWorkout = () => {
    setIsCustomWorkout(false);
    setCustomWod({
      name: '',
      type: 'For Time',
      movements: [{ name: '', reps: '', notes: '' }]
    });
    setCustomMovementInput(['']);
    setShowCustomMovementDropdown([false]);
    setCurrentView('dashboard');
    if (currentUser.role === 'coach') {
      setCoachView('dashboard');
    }
  };

  const addCustomMovement = () => {
    setCustomWod({
      ...customWod,
      movements: [...customWod.movements, { name: '', reps: '', notes: '' }]
    });
    setCustomMovementInput([...customMovementInput, '']);
    setShowCustomMovementDropdown([...showCustomMovementDropdown, false]);
  };

  const removeCustomMovement = (index) => {
    if (customWod.movements.length <= 1) return;
    setCustomWod({
      ...customWod,
      movements: customWod.movements.filter((_, i) => i !== index)
    });
    setCustomMovementInput(customMovementInput.filter((_, i) => i !== index));
    setShowCustomMovementDropdown(showCustomMovementDropdown.filter((_, i) => i !== index));
  };

  const updateCustomMovement = (index, field, value) => {
    const updated = [...customWod.movements];
    updated[index][field] = value;
    setCustomWod({ ...customWod, movements: updated });
  };

  const handleCustomMovementInput = (index, value) => {
    const newInputs = [...customMovementInput];
    newInputs[index] = value;
    setCustomMovementInput(newInputs);

    // Update the movement name
    updateCustomMovement(index, 'name', value);

    // Show/hide dropdown based on input
    const newDropdowns = [...showCustomMovementDropdown];
    newDropdowns[index] = value.length > 0;
    setShowCustomMovementDropdown(newDropdowns);
  };

  const selectCustomMovement = (index, movementName) => {
    const newInputs = [...customMovementInput];
    newInputs[index] = movementName;
    setCustomMovementInput(newInputs);
    updateCustomMovement(index, 'name', movementName);

    const newDropdowns = [...showCustomMovementDropdown];
    newDropdowns[index] = false;
    setShowCustomMovementDropdown(newDropdowns);
  };

  const logCustomWorkout = async () => {
    // Validate custom workout has at least one movement with a name
    const validMovements = customWod.movements.filter(m => m.name.trim());
    if (validMovements.length === 0) {
      alert('Please add at least one movement to your workout');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const resultData = {
      wodId: null, // No coach WOD
      date: today,
      time: myResult.time,
      movements: validMovements.map(m => ({ ...m, weight: '' })),
      notes: myResult.notes,
      photoData: myResult.photoData,
      customWodName: customWod.name || null,
      customWodType: customWod.type,
    };

    try {
      if (myResult.existingResultId) {
        await db.updateResult(myResult.existingResultId, resultData);
        alert('Custom workout updated!');
      } else {
        await db.createResult(resultData, currentUser.id, currentUser.name, currentUser.email);
        alert('Custom workout logged! Great job!');
      }

      const results = await loadMyResults();
      await loadMissedWODs(results);

      if (currentUser.role === 'coach') {
        await loadAllResults();
      }

      // Reset custom workout state
      setIsCustomWorkout(false);
      setCustomWod({
        name: '',
        type: 'For Time',
        movements: [{ name: '', reps: '', notes: '' }]
      });
      setCurrentView('dashboard');
      if (currentUser.role === 'coach') {
        setCoachView('dashboard');
      }
    } catch (error) {
      alert('Error logging custom workout: ' + error.message);
    }
  };

  const editWOD = (wod) => {
    setEditingWOD(wod);
    setNewWOD({
      name: wod.name || '',
      date: wod.date,
      type: wod.type,
      group: wod.group,
      movements: wod.movements,
      notes: wod.notes
    });
    setMovementInput(wod.movements.map(m => m.name));
    setShowMovementDropdown(wod.movements.map(() => false));
    setShowWODForm(true);
    setCoachView('program');
  };

  const deleteWOD = async (wod) => {
    // Check if any athletes have logged results for this WOD (use allAthleteResults for accurate check)
    const athleteResults = allAthleteResults.filter(r => 
      r.date === wod.date && r.athleteEmail !== currentUser.email
    );
    
    if (athleteResults.length > 0) {
      alert(`Cannot delete this WOD. ${athleteResults.length} athlete${athleteResults.length !== 1 ? 's have' : ' has'} already logged results for this workout.`);
      return;
    }

    // Set confirmation state using the wod object (with id)
    setShowDeleteWODConfirm({ ...wod });
  };

  const confirmDeleteWOD = async () => {
    if (!showDeleteWODConfirm) return;

    const wod = showDeleteWODConfirm;

    // Check if coach has logged their own result
    const coachResult = workoutResults.find(r =>
      r.date === wod.date && r.athleteEmail === currentUser.email
    );

    try {
      // Delete coach's result if exists
      if (coachResult) {
        await db.deleteResult(coachResult.id);
      }

      // Delete the WOD
      await db.deleteWod(wod.id);

      // Refresh data
      await loadAllWODs();
      await loadTodayWOD();
      await loadMyResults();
      await loadAllResults();

      setShowDeleteWODConfirm(null);
      alert('WOD deleted successfully');
    } catch (error) {
      alert('Error deleting WOD: ' + error.message);
      setShowDeleteWODConfirm(null);
    }
  };

  const updateMovementWeight = (index, weight) => {
    const updated = [...myResult.movements];
    updated[index].weight = weight;
    setMyResult({ ...myResult, movements: updated });
  };

  // Calculate user statistics
  const calculateStats = () => {
    // Filter to only current user's workouts
    const myWorkouts = workoutResults.filter(r => r.athleteEmail === currentUser?.email);
    
    const totalWorkouts = myWorkouts.length;
    const thisMonth = myWorkouts.filter(r => {
      const resultDate = new Date(r.date);
      const now = new Date();
      return resultDate.getMonth() === now.getMonth() && 
             resultDate.getFullYear() === now.getFullYear();
    }).length;
    
    const thisWeek = myWorkouts.filter(r => {
      const resultDate = new Date(r.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return resultDate >= weekAgo;
    }).length;

    const thisYear = myWorkouts.filter(r => {
      const resultDate = new Date(r.date);
      const now = new Date();
      return resultDate.getFullYear() === now.getFullYear();
    }).length;

    // Weekly streak - count workouts this week (good week = 3+)
    const weeklyStreak = thisWeek;

    // Most common movements (only from user's own workouts)
    const movementCounts = {};
    myWorkouts.forEach(result => {
      result.movements.forEach(movement => {
        if (movement.name) {
          movementCounts[movement.name] = (movementCounts[movement.name] || 0) + 1;
        }
      });
    });
    
    const topMovements = Object.entries(movementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalWorkouts,
      thisMonth,
      thisWeek,
      thisYear,
      currentStreak: weeklyStreak,
      topMovements
    };
  };

  const editPastWorkout = (result) => {
    setEditingWorkout(result);
    setMyResult({
      time: result.time,
      movements: result.movements,
      notes: result.notes,
      photoData: result.photoData,
      existingResultId: result.id
    });
    setCurrentView('workout');
  };

  const deleteWorkout = async (workoutId) => {
    try {
      await db.deleteResult(workoutId);
      await loadMyResults();
      if (currentUser.role === 'coach') {
        await loadAllResults();
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      alert('Error deleting workout: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingWorkout(null);
    if (todayWOD) {
      // Reset to today's WOD if available
      const today = new Date().toISOString().split('T')[0];
      const todayResult = workoutResults.find(r => r.date === today);
      if (todayResult) {
        setMyResult({
          time: todayResult.time,
          movements: todayResult.movements,
          notes: todayResult.notes,
          photoData: todayResult.photoData,
          existingResultId: todayResult.id
        });
      } else {
        setMyResult({
          time: '',
          movements: todayWOD.movements.map(m => ({ ...m, weight: '' })),
          notes: '',
          photoData: null
        });
      }
    }
    setCurrentView('dashboard');
  };

  // Photo Modal Component
  const PhotoModal = () => {
    if (!photoModalUrl) return null;

    return (
      <div
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={() => setPhotoModalUrl(null)}
      >
        <button
          onClick={() => setPhotoModalUrl(null)}
          className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={photoModalUrl}
          alt="Workout photo"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  };

  // Login/Signup Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-5 py-8 sm:px-6 md:px-8">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 md:p-10 border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-10">
            <BBoxLogo className="w-28 h-14 mx-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">CrossFit</h1>
            <p className="text-slate-400 text-base">Workout Logger</p>
          </div>

          {showForgotPassword ? (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Reset Password</h2>

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

              <p className="text-slate-400 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="space-y-8">
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setAuthError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                    className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={authLoading}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl mt-10 mb-6 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25"
              >
                {authLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setAuthError('');
                    setAuthSuccess('');
                    setResetEmail('');
                  }}
                  className="text-red-500 hover:text-red-400 text-sm font-semibold"
                >
                  Back to Login
                </button>
              </div>
            </>
          ) : !showSignup ? (
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
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="block text-slate-400 text-sm font-medium">Password</label>
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
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={authLoading}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl mt-10 mb-6 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25"
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
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Create Account</h2>

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

              <div className="space-y-6">
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2.5">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={signupName}
                    onChange={(e) => {
                      setSignupName(e.target.value);
                      setAuthError('');
                    }}
                    className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2.5">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setAuthError('');
                    }}
                    className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2.5">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      setAuthError('');
                    }}
                    className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                  />
                  {signupPassword.length > 0 && signupPassword.length < 6 && (
                    <p className="text-yellow-400 text-xs mt-2">Password must be at least 6 characters</p>
                  )}
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2.5">Confirm Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setSignupConfirmPassword(e.target.value);
                      setAuthError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                    className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                  />
                  {signupConfirmPassword.length > 0 && signupPassword !== signupConfirmPassword && (
                    <p className="text-yellow-400 text-xs mt-2">Passwords do not match</p>
                  )}
                  {signupConfirmPassword.length > 0 && signupPassword === signupConfirmPassword && signupPassword.length >= 6 && (
                    <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Passwords match
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2.5">I am a...</label>
                    <select
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value)}
                      className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                    >
                      <option value="athlete">Athlete</option>
                      <option value="coach">Coach</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2.5">Group</label>
                    <select
                      value={signupGroup}
                      onChange={(e) => setSignupGroup(e.target.value)}
                      className="w-full bg-slate-700/50 text-white text-base px-4 py-3.5 rounded-xl border border-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                    >
                      <option value="mens">Men's</option>
                      <option value="womens">Women's</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignup}
                disabled={authLoading}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl mt-10 mb-6 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25"
              >
                {authLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : 'Create Account'}
              </button>

              <div className="text-center pt-2">
                <span className="text-slate-400 text-sm">Already have an account? </span>
                <button
                  onClick={() => {
                    setShowSignup(false);
                    setAuthError('');
                    setSignupEmail('');
                    setSignupPassword('');
                    setSignupConfirmPassword('');
                    setSignupName('');
                  }}
                  className="text-red-500 hover:text-red-400 text-sm font-semibold ml-1"
                >
                  Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Coach Dashboard
  if (currentUser.role === 'coach') {
    const stats = calculateStats();

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
                onClick={handleLogout}
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
              <>
                {/* Personal Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-red-600 rounded-2xl p-5">
                    <div className="text-red-100 text-xs font-medium tracking-wide mb-1">TOTAL</div>
                    <div className="text-4xl font-bold text-white mb-1">{stats.totalWorkouts}</div>
                    <div className="text-red-200 text-sm">Workouts</div>
                  </div>
                  <div className="bg-orange-600 rounded-2xl p-5">
                    <div className="text-orange-100 text-xs font-medium tracking-wide mb-1">THIS WEEK</div>
                    <div className="text-4xl font-bold text-white mb-1">
                      {stats.currentStreak}/7
                    </div>
                    <div className="text-orange-200 text-sm">
                      {stats.currentStreak >= 3 ? 'Strong!' : 'WODs'}
                    </div>
                  </div>
                  <div className="bg-blue-600 rounded-2xl p-5">
                    <div className="text-blue-100 text-xs font-medium tracking-wide mb-1">THIS MONTH</div>
                    <div className="text-4xl font-bold text-white mb-1">{stats.thisMonth}</div>
                    <div className="text-blue-200 text-sm">Workouts</div>
                  </div>
                  <div className="bg-purple-600 rounded-2xl p-5">
                    <div className="text-purple-100 text-xs font-medium tracking-wide mb-1">THIS YEAR</div>
                    <div className="text-4xl font-bold text-white mb-1">{stats.thisYear}</div>
                    <div className="text-purple-200 text-sm">Workouts</div>
                  </div>
                </div>

                {/* Today's WOD - Same as Athlete View */}
                {todayWOD ? (
                  <div className="bg-slate-800 rounded-2xl p-5 mb-6 border border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg sm:text-xl font-bold text-white">
                            {todayWOD.name ? `"${todayWOD.name}"` : "Today's WOD"}
                          </h3>
                          <span className="bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                            {todayWOD.type}
                          </span>
                          <span className="bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg capitalize">
                            {todayWOD.group}
                          </span>
                        </div>
                        <div className="text-slate-400 text-sm mb-4">
                          Posted by {todayWOD.postedBy}
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-4">
                          {myResult.existingResultId ? (
                            <div className="flex items-center gap-2">
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Completed
                              </span>
                              {myResult.time && (
                                <span className="text-slate-400 text-sm">• {myResult.time}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-yellow-400 text-sm flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Not logged yet
                            </span>
                          )}
                          {(() => {
                            const today = new Date().toISOString().split('T')[0];
                            const athletesCompleted = allAthleteResults.filter(r => 
                              r.date === today && r.athleteEmail !== currentUser.email
                            ).length;
                            return athletesCompleted > 0 && (
                              <span className="text-slate-400 text-xs">
                                • {athletesCompleted} athlete{athletesCompleted !== 1 ? 's' : ''} completed
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* WOD Details Preview */}
                    <div className="bg-slate-700 rounded-xl p-4 mb-4">
                      <div className="space-y-3">
                        {todayWOD.movements.map((movement, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-semibold">{movement.name}</div>
                              <div className="text-slate-300 text-sm">{movement.reps}</div>
                              {movement.notes && (
                                <div className="text-slate-400 text-sm mt-1">{movement.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {todayWOD.notes && (
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <div className="text-slate-400 text-sm">
                            <span className="font-semibold">Coach Notes:</span> {todayWOD.notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCoachView('workout')}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        {myResult.existingResultId ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit My Results
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Log My Workout
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => editWOD(todayWOD)}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit WOD
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700 mb-6">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">No WOD Posted Yet</p>
                    <p className="text-slate-400 text-sm mb-4">Post today's workout to get started</p>
                    <button
                      onClick={() => {
                        setCoachView('program');
                        setEditingWOD(null);
                        setNewWOD({
                          name: '',
                          date: new Date().toISOString().split('T')[0],
                          type: 'For Time',
                          group: 'combined',
                          movements: [{ name: '', reps: '', notes: '' }],
                          notes: ''
                        });
                        setMovementInput(['']);
                        setShowMovementDropdown([false]);
                        setShowWODForm(true);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Post Today's WOD
                    </button>
                  </div>
                )}

                {/* Missed WODs Section - Coach Dashboard */}
                {missedWODs.length > 0 && (
                  <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 mb-6 border border-amber-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-amber-500/20 p-2 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Missed Workouts</h3>
                        <p className="text-slate-400 text-sm">Log results for previous days</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {missedWODs.map((wod) => (
                        <div
                          key={wod.id}
                          className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 hover:border-amber-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-amber-400 text-sm font-medium">
                                  {new Date(wod.date + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                <span className="bg-red-600/80 text-white text-xs px-2 py-0.5 rounded">
                                  {wod.type}
                                </span>
                              </div>
                              <div className="text-white font-medium mb-1">
                                {wod.name || `${wod.type} Workout`}
                              </div>
                              <div className="text-slate-400 text-sm">
                                {wod.movements.length} movement{wod.movements.length !== 1 ? 's' : ''} • {wod.movements.slice(0, 2).map(m => m.name).join(', ')}{wod.movements.length > 2 ? '...' : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => startLogMissedWOD(wod)}
                              className="ml-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                              Log
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Movements - Same as Athlete */}
                {stats.topMovements.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-5 mb-6 border border-slate-700 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4">Most Common Movements</h3>
                    <div className="space-y-3">
                      {stats.topMovements.map(([movement, count], idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="text-white font-medium">{movement}</span>
                          </div>
                          <span className="text-slate-400">{count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Workouts */}
                {workoutResults.filter(r => r.athleteEmail === currentUser.email).length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-5 mb-6 border border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Recent Workouts</h3>
                      <button
                        onClick={() => setCoachView('history')}
                        className="text-red-500 hover:text-red-400 text-sm font-medium flex items-center gap-1"
                      >
                        View All
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3">
                      {workoutResults
                        .filter(r => r.athleteEmail === currentUser.email)
                        .slice(0, 5)
                        .map((result) => {
                          // Find the WOD for this workout
                          const wod = allWODs.find(w => w.date === result.date);
                          // Count how many people completed this workout (use allAthleteResults for accurate count)
                          const completedCount = allAthleteResults.filter(r => r.date === result.date).length;
                          
                          return (
                            <div 
                              key={result.id}
                              className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden"
                            >
                              {/* Delete Confirmation Overlay */}
                              {showDeleteConfirm === result.id && (
                                <div className="bg-red-600 p-4">
                                  <p className="text-white font-semibold mb-3">Delete this workout?</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => deleteWorkout(result.id)}
                                      className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteConfirm(null)}
                                      className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showDeleteConfirm !== result.id && (
                                <>
                                  <div 
                                    onClick={() => editPastWorkout(result)}
                                    className="p-4 active:bg-slate-600 transition-colors cursor-pointer"
                                  >
                                    {/* Header: WOD Name + Type + Time */}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {wod?.name ? (
                                            <h4 className="text-white font-bold text-base">"{wod.name}"</h4>
                                          ) : result.customWodName ? (
                                            <h4 className="text-white font-bold text-base">"{result.customWodName}"</h4>
                                          ) : (
                                            <h4 className="text-white font-medium text-base">{result.customWodType ? 'Custom Workout' : 'Daily WOD'}</h4>
                                          )}
                                          {wod?.type ? (
                                            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                              {wod.type}
                                            </span>
                                          ) : result.customWodType && (
                                            <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                              {result.customWodType}
                                            </span>
                                          )}
                                          {!wod && result.customWodName && (
                                            <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                              Custom
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {result.time && (
                                        <div className="bg-slate-700 px-2 py-1 rounded ml-2">
                                          <span className="text-white text-sm font-bold">{result.time}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-3 mb-3 text-xs">
                                      <div className="flex items-center gap-1 text-slate-400">
                                        <Calendar className="w-3 h-3 text-red-500" />
                                        <span className="text-slate-300">
                                          {new Date(result.date).toLocaleDateString('en-US', { 
                                            weekday: 'short',
                                            month: 'short', 
                                            day: 'numeric' 
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-slate-400">
                                        <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span><span className="text-green-400 font-medium">{completedCount}</span> completed</span>
                                      </div>
                                    </div>
                                    
                                    {/* Movement Pills */}
                                    <div className="flex flex-wrap gap-1">
                                      {result.movements.slice(0, 3).map((movement, idx) => (
                                        <div key={idx} className="bg-slate-600 px-2 py-1 rounded text-xs">
                                          <span className="text-white">{movement.name}</span>
                                          {movement.weight && (
                                            <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                          )}
                                        </div>
                                      ))}
                                      {result.movements.length > 3 && (
                                        <div className="bg-slate-600 px-2 py-1 rounded text-xs text-slate-400">
                                          +{result.movements.length - 3} more
                                        </div>
                                      )}
                                    </div>

                                    {/* Photo indicator */}
                                    {result.photoData && (
                                      <div className="mt-2 flex items-center gap-1 text-slate-400 text-xs">
                                        <Image className="w-3 h-3" />
                                        <span>Photo attached</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="border-t border-slate-600 grid grid-cols-2">
                                    <button
                                      onClick={() => editPastWorkout(result)}
                                      className="py-2.5 text-blue-400 hover:bg-slate-600 transition-colors font-medium text-sm"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteConfirm(result.id)}
                                      className="py-2.5 text-red-400 hover:bg-slate-600 transition-colors font-medium text-sm border-l border-slate-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Coach History View */}
            {coachView === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Workout History</h2>
                </div>

                {/* Search Bar */}
                <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by workout name or date..."
                      value={coachHistorySearch}
                      onChange={(e) => setCoachHistorySearch(e.target.value)}
                      className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                    />
                    {coachHistorySearch && (
                      <button
                        onClick={() => setCoachHistorySearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Workout List */}
                {(() => {
                  const myWorkouts = workoutResults.filter(r => r.athleteEmail === currentUser.email);
                  const filteredWorkouts = myWorkouts
                    .filter(result => {
                      if (!coachHistorySearch) return true;
                      const searchLower = coachHistorySearch.toLowerCase();
                      const wod = allWODs.find(w => w.date === result.date);
                      const dateStr = new Date(result.date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      }).toLowerCase();
                      return (
                        (wod?.name?.toLowerCase() || '').includes(searchLower) ||
                        dateStr.includes(searchLower)
                      );
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                  if (filteredWorkouts.length === 0) {
                    return (
                      <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
                        <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">
                          {coachHistorySearch ? 'No workouts match your search' : 'No workouts logged yet'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <p className="text-slate-400 text-sm">{filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''} found</p>
                      {filteredWorkouts.map((result) => {
                        const wod = allWODs.find(w => w.date === result.date);
                        const completedCount = allAthleteResults.filter(r => r.date === result.date).length;
                        
                        return (
                          <div 
                            key={result.id}
                            className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
                          >
                            {/* Delete Confirmation */}
                            {showDeleteConfirm === result.id && (
                              <div className="bg-red-600 p-4">
                                <p className="text-white font-semibold mb-3">Delete this workout?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => deleteWorkout(result.id)}
                                    className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {showDeleteConfirm !== result.id && (
                              <>
                                <div
                                  onClick={() => {
                                    editPastWorkout(result);
                                    setCoachView('workout');
                                  }}
                                  className="p-4 active:bg-slate-700 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {wod?.name ? (
                                          <h4 className="text-white font-bold text-lg">"{wod.name}"</h4>
                                        ) : result.customWodName ? (
                                          <h4 className="text-white font-bold text-lg">"{result.customWodName}"</h4>
                                        ) : (
                                          <h4 className="text-white font-medium">{result.customWodType ? 'Custom Workout' : 'Daily WOD'}</h4>
                                        )}
                                        {wod?.type ? (
                                          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                            {wod.type}
                                          </span>
                                        ) : result.customWodType && (
                                          <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                            {result.customWodType}
                                          </span>
                                        )}
                                        {!wod && result.customWodName && (
                                          <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                            Custom
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {result.time && (
                                      <div className="bg-slate-700 px-3 py-1 rounded-lg ml-2">
                                        <span className="text-white font-bold text-sm">{result.time}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-4 mb-3 text-xs">
                                    <div className="flex items-center gap-1 text-slate-400">
                                      <Calendar className="w-3 h-3 text-red-500" />
                                      <span className="text-slate-300">
                                        {new Date(result.date).toLocaleDateString('en-US', {
                                          weekday: 'short', month: 'short', day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400">
                                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <span><span className="text-green-400 font-medium">{completedCount}</span> completed</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {result.movements.slice(0, 4).map((movement, idx) => (
                                      <div key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                                        <span className="text-white font-medium">{movement.name}</span>
                                        {movement.weight && (
                                          <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                        )}
                                      </div>
                                    ))}
                                    {result.movements.length > 4 && (
                                      <div className="bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-400">
                                        +{result.movements.length - 4} more
                                      </div>
                                    )}
                                  </div>

                                  {result.photoData && (
                                    <div
                                      className="mt-3 -mx-4 -mb-4 cursor-pointer"
                                      onClick={() => setPhotoModalUrl(result.photoData)}
                                    >
                                      <img src={result.photoData} alt="Workout" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                                    </div>
                                  )}
                                </div>

                                <div className="border-t border-slate-700 grid grid-cols-2">
                                  <button
                                    onClick={() => {
                                      editPastWorkout(result);
                                      setCoachView('workout');
                                    }}
                                    className="py-3 text-blue-400 hover:bg-slate-700 transition-colors font-medium text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(result.id)}
                                    className="py-3 text-red-400 hover:bg-slate-700 transition-colors font-medium text-sm border-l border-slate-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* My Workout View */}
            {coachView === 'workout' && (
              <>
                {((todayWOD || editingWorkout) && !isCustomWorkout) ? (
                  <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
                    {editingWorkout && (
                      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            <span className="font-semibold">
                              Editing workout from {new Date(editingWorkout.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          <button
                            onClick={cancelEdit}
                            className="text-white hover:text-blue-100"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {!editingWorkout && myResult.existingResultId && (
                      <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                        <UserCircle className="w-5 h-5" />
                        <span className="font-semibold">Editing your existing workout for today</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-white">
                        {editingWorkout ? 'Edit Workout' : 'Today\'s WOD'}
                      </h2>
                      <div className="flex gap-2">
                        {todayWOD && !editingWorkout && (
                          <>
                            <span className="bg-red-600 text-white text-sm px-3 py-1 rounded">{todayWOD.type}</span>
                            <span className="bg-slate-700 text-white text-sm px-3 py-1 rounded capitalize">{todayWOD.group}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {(editingWorkout ? editingWorkout.movements : todayWOD?.movements || []).map((movement, idx) => (
                        <div key={idx} className="bg-slate-700 rounded-lg p-4">
                          <div className="font-bold text-white text-lg mb-1">{movement.name}</div>
                          <div className="text-slate-400 mb-3">
                            {movement.reps}
                            {movement.notes && <span className="text-sm ml-2">({movement.notes})</span>}
                          </div>
                          <input
                            type="text"
                            placeholder="Your weight (e.g., 75lb, scaled, bodyweight)"
                            value={myResult.movements[idx]?.weight || ''}
                            onChange={(e) => updateMovementWeight(idx, e.target.value)}
                            className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {todayWOD?.notes && !editingWorkout && (
                      <div className="bg-slate-700 rounded p-3 mb-4 text-slate-300 text-sm">
                        <strong>Coach Notes:</strong> {todayWOD.notes}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Your Time/Score</label>
                      <input
                        type="text"
                        placeholder="e.g., 12:34 or 8 rounds + 15 reps"
                        value={myResult.time}
                        onChange={(e) => setMyResult({ ...myResult, time: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Add Photo</label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
                          <Image className="w-5 h-5" />
                          Take Photo
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
                          <Image className="w-5 h-5" />
                          Choose Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {myResult.photoData && (
                        <div className="relative">
                          <img
                            src={myResult.photoData}
                            alt="Preview"
                            className="w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPhotoModalUrl(myResult.photoData)}
                          />
                          <button
                            onClick={() => setMyResult({ ...myResult, photoData: null })}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Notes</label>
                      <textarea
                        placeholder="How did it feel? Any modifications?"
                        value={myResult.notes}
                        onChange={(e) => setMyResult({ ...myResult, notes: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-24"
                      />
                    </div>

                    <button
                      onClick={logResult}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      {myResult.existingResultId ? 'Update My Workout' : 'Log My Workout'}
                    </button>
                    
                    {editingWorkout && (
                      <button
                        onClick={cancelEdit}
                        className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}

                    {!myResult.existingResultId && !editingWorkout && (
                      <button
                        onClick={startCustomWorkout}
                        className="w-full mt-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                      >
                        Did a different workout? Log custom WOD
                      </button>
                    )}
                  </div>
                ) : !isCustomWorkout ? (
                  <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
                    <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 mb-4">No WOD posted for today yet</p>
                    <button
                      onClick={startCustomWorkout}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Log Custom Workout
                    </button>
                  </div>
                ) : (
                  /* Custom Workout Form for Coach */
                  <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white">Custom Workout</h2>
                      <button
                        onClick={cancelCustomWorkout}
                        className="text-slate-400 hover:text-white p-2"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Workout Name */}
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Workout Name (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., Travel WOD, Hotel Workout"
                        value={customWod.name}
                        onChange={(e) => setCustomWod({ ...customWod, name: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    {/* Workout Type */}
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Workout Type</label>
                      <select
                        value={customWod.type}
                        onChange={(e) => setCustomWod({ ...customWod, type: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                      >
                        <option value="For Time">For Time</option>
                        <option value="AMRAP">AMRAP</option>
                        <option value="EMOM">EMOM</option>
                        <option value="Rounds">Rounds</option>
                        <option value="Strength">Strength</option>
                        <option value="Skill">Skill</option>
                        <option value="Chipper">Chipper</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Movements */}
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Movements</label>
                      <div className="space-y-3">
                        {customWod.movements.map((movement, idx) => (
                          <div key={idx} className="bg-slate-700 rounded-lg p-4">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  placeholder="Movement name"
                                  value={customMovementInput[idx] || ''}
                                  onChange={(e) => handleCustomMovementInput(idx, e.target.value)}
                                  onFocus={() => {
                                    const newDropdowns = showCustomMovementDropdown.map((_, i) => i === idx && customMovementInput[idx]?.length > 0);
                                    setShowCustomMovementDropdown(newDropdowns);
                                  }}
                                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                                />
                                {showCustomMovementDropdown[idx] && (
                                  <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                                    {STANDARD_MOVEMENTS
                                      .filter(m => m.toLowerCase().includes((customMovementInput[idx] || '').toLowerCase()))
                                      .slice(0, 8)
                                      .map((m) => (
                                        <button
                                          key={m}
                                          onClick={() => selectCustomMovement(idx, m)}
                                          className="w-full text-left px-3 py-2 text-white hover:bg-slate-700"
                                        >
                                          {m}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                              {customWod.movements.length > 1 && (
                                <button
                                  onClick={() => removeCustomMovement(idx)}
                                  className="text-red-400 hover:text-red-300 p-2"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="Reps (e.g., 21-15-9, 10 rounds)"
                              value={movement.reps}
                              onChange={(e) => updateCustomMovement(idx, 'reps', e.target.value)}
                              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={addCustomMovement}
                        className="mt-3 text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Movement
                      </button>
                    </div>

                    {/* Time */}
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Time / Score</label>
                      <input
                        type="text"
                        placeholder="e.g., 15:30, 5 rounds + 10 reps"
                        value={myResult.time}
                        onChange={(e) => setMyResult({ ...myResult, time: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2">Notes</label>
                      <textarea
                        placeholder="How did it feel? Any modifications?"
                        value={myResult.notes}
                        onChange={(e) => setMyResult({ ...myResult, notes: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-24"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={logCustomWorkout}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Log Custom Workout
                    </button>

                    <button
                      onClick={cancelCustomWorkout}
                      className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Program View - WOD Management */}
            {coachView === 'program' && (
              <>
                {!showWODForm ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white">WOD Programming</h2>
                      <button
                        onClick={() => {
                          setEditingWOD(null);
                          setNewWOD({
                            name: '',
                            date: new Date().toISOString().split('T')[0],
                            type: 'For Time',
                            group: 'combined',
                            movements: [{ name: '', reps: '', notes: '' }],
                            notes: ''
                          });
                          setMovementInput(['']);
                          setShowMovementDropdown([false]);
                          setShowWODForm(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        New WOD
                      </button>
                    </div>

                    {allWODs.length === 0 ? (
                      <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                        <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 mb-4">No WODs programmed yet</p>
                        <button
                          onClick={() => setShowWODForm(true)}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                          Program First WOD
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allWODs.map((wod) => {
                          const wodDate = new Date(wod.date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          wodDate.setHours(0, 0, 0, 0);
                          const isToday = wodDate.getTime() === today.getTime();
                          const isPast = wodDate < today;
                          const coachHasResult = workoutResults.find(r => 
                            r.date === wod.date && r.athleteEmail === currentUser.email
                          );

                          return (
                            <div 
                              key={wod.id}
                              className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
                            >
                              {/* Delete Confirmation Overlay */}
                              {showDeleteWODConfirm?.id === wod.id && (
                                <div className="bg-red-600 p-4">
                                  <p className="text-white font-semibold mb-2">Delete this WOD?</p>
                                  {coachHasResult && (
                                    <p className="text-red-100 text-sm mb-3">
                                      This will also delete your logged workout for this day.
                                    </p>
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={confirmDeleteWOD}
                                      className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteWODConfirm(null)}
                                      className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Main Card Content */}
                              {showDeleteWODConfirm?.id !== wod.id && (
                                <>
                              <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    {wod.name && (
                                      <div className="text-xl font-bold text-white mb-2">
                                        "{wod.name}"
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="w-4 h-4 text-red-500" />
                                      <span className="text-white font-bold">
                                        {wodDate.toLocaleDateString('en-US', { 
                                          weekday: 'short',
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      {isToday && (
                                        <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                          TODAY
                                        </span>
                                      )}
                                      {isPast && !isToday && (
                                        <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                          Past
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
                                        {wod.type}
                                      </span>
                                      <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded capitalize">
                                        {wod.group}
                                      </span>
                                    </div>
                                    <div className="text-slate-400 text-xs">
                                      Posted by {wod.postedBy}
                                    </div>
                                  </div>
                                </div>

                                {/* Movement Pills */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {wod.movements.map((movement, idx) => (
                                    <div key={idx} className="bg-slate-700 px-3 py-1.5 rounded-full text-sm">
                                      <span className="text-white font-medium">{movement.name}</span>
                                      <span className="text-slate-400 ml-1 text-xs">{movement.reps}</span>
                                    </div>
                                  ))}
                                </div>

                                {wod.notes && (
                                  <div className="bg-slate-700 rounded p-2 text-slate-300 text-xs mb-3">
                                    {wod.notes}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="border-t border-slate-700 grid grid-cols-2">
                                <button
                                  onClick={() => editWOD(wod)}
                                  className="py-3 text-blue-400 hover:bg-slate-700 transition-colors font-medium text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteWOD(wod)}
                                  className="py-3 text-red-400 hover:bg-slate-700 transition-colors font-medium text-sm border-l border-slate-700"
                                >
                                  Delete
                                </button>
                              </div>
                              </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-white">
                        {editingWOD ? 'Edit WOD' : 'Post New WOD'}
                      </h2>
                      <button
                        onClick={() => {
                          setShowWODForm(false);
                          setEditingWOD(null);
                          setNewWOD({
                            name: '',
                            date: new Date().toISOString().split('T')[0],
                            type: 'For Time',
                            group: 'combined',
                            movements: [{ name: '', reps: '', notes: '' }],
                            notes: ''
                          });
                          setMovementInput(['']);
                          setShowMovementDropdown([false]);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* WOD Name Field */}
                    <div className="mb-4">
                      <label className="block text-slate-300 text-sm font-medium mb-2">
                        WOD Name <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder='e.g., "Cindy", "Fran", "Murph"'
                        value={newWOD.name}
                        onChange={(e) => setNewWOD({ ...newWOD, name: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-slate-300 mb-2 text-sm">Date</label>
                        <input
                          type="date"
                          value={newWOD.date}
                          onChange={(e) => setNewWOD({ ...newWOD, date: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2 text-sm">Type</label>
                        <select
                          value={newWOD.type}
                          onChange={(e) => setNewWOD({ ...newWOD, type: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
                        >
                          <option>For Time</option>
                          <option>AMRAP</option>
                          <option>EMOM</option>
                          <option>Chipper</option>
                          <option>Strength</option>
                          <option>Metcon</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2 text-sm">Group</label>
                        <select
                          value={newWOD.group}
                          onChange={(e) => setNewWOD({ ...newWOD, group: e.target.value })}
                          className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none text-sm"
                        >
                          <option value="combined">Combined</option>
                          <option value="mens">Men's</option>
                          <option value="womens">Women's</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-slate-300 font-semibold text-sm">Movements</label>
                        <button
                          onClick={addMovement}
                          className="text-red-500 hover:text-red-400 flex items-center gap-1 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      </div>

                      {newWOD.movements.map((movement, index) => (
                        <div key={index} className="bg-slate-700 rounded-lg p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="col-span-2 relative">
                                <input
                                  type="text"
                                  placeholder="Type to search movements..."
                                  value={movementInput[index] || ''}
                                  onChange={(e) => handleMovementInput(index, e.target.value)}
                                  onFocus={() => {
                                    if (movementInput[index]?.trim()) {
                                      const updatedDropdown = [...showMovementDropdown];
                                      updatedDropdown[index] = true;
                                      setShowMovementDropdown(updatedDropdown);
                                    }
                                  }}
                                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
                                />
                                {showMovementDropdown[index] && filteredMovements.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-slate-600 border border-slate-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredMovements.slice(0, 10).map((mov, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => selectMovement(index, mov)}
                                        className="px-3 py-2 hover:bg-red-600 cursor-pointer text-white transition-colors text-sm"
                                      >
                                        {mov}
                                      </div>
                                    ))}
                                    {!STANDARD_MOVEMENTS.includes(movementInput[index]) && movementInput[index]?.trim() && (
                                      <div
                                        onClick={() => {
                                          const updatedDropdown = [...showMovementDropdown];
                                          updatedDropdown[index] = false;
                                          setShowMovementDropdown(updatedDropdown);
                                        }}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 cursor-pointer text-white border-t border-slate-500 font-semibold transition-colors text-sm"
                                      >
                                        + Add "{movementInput[index]}" as custom
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <input
                                type="text"
                                placeholder="Reps (e.g., 21-15-9)"
                                value={movement.reps}
                                onChange={(e) => updateMovement(index, 'reps', e.target.value)}
                                className="bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Notes (e.g., Rx: 95/65)"
                                value={movement.notes}
                                onChange={(e) => updateMovement(index, 'notes', e.target.value)}
                                className="bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
                              />
                            </div>
                            {newWOD.movements.length > 1 && (
                              <button
                                onClick={() => removeMovement(index)}
                                className="text-red-400 hover:text-red-300 mt-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4">
                      <label className="block text-slate-300 mb-2 text-sm">Notes</label>
                      <textarea
                        placeholder="Additional workout notes..."
                        value={newWOD.notes}
                        onChange={(e) => setNewWOD({ ...newWOD, notes: e.target.value })}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-20 text-sm"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={postWOD}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        {editingWOD ? 'Update WOD' : 'Post WOD'}
                      </button>
                      <button
                        onClick={() => {
                          setShowWODForm(false);
                          setEditingWOD(null);
                          setNewWOD({
                            date: new Date().toISOString().split('T')[0],
                            type: 'For Time',
                            group: 'combined',
                            movements: [{ name: '', reps: '', notes: '' }],
                            notes: ''
                          });
                          setMovementInput(['']);
                          setShowMovementDropdown([false]);
                        }}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Athletes View - Results Feed */}
            {coachView === 'athletes' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Athletes</h2>
                {(() => {
                  // Group results by athlete - use allAthleteResults for coaches
                  const athleteData = {};
                  allAthleteResults.forEach(result => {
                    if (!athleteData[result.athleteEmail]) {
                      athleteData[result.athleteEmail] = {
                        name: result.athleteName,
                        email: result.athleteEmail,
                        workouts: []
                      };
                    }
                    athleteData[result.athleteEmail].workouts.push(result);
                  });

                  // Convert to array and calculate stats
                  const athletes = Object.values(athleteData).map(athlete => {
                    const workouts = athlete.workouts.sort((a, b) =>
                      new Date(b.date) - new Date(a.date)
                    );
                    
                    // Calculate stats
                    const thisWeek = workouts.filter(w => {
                      const workoutDate = new Date(w.date);
                      const now = new Date();
                      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      return workoutDate >= weekAgo;
                    }).length;
                    
                    const lastWorkout = workouts[0];
                    const lastWorkoutDate = lastWorkout ? new Date(lastWorkout.date) : null;
                    const daysAgo = lastWorkoutDate ? 
                      Math.floor((new Date() - lastWorkoutDate) / (1000 * 60 * 60 * 24)) : null;

                    return {
                      ...athlete,
                      total: workouts.length,
                      thisWeek,
                      lastWorkout,
                      daysAgo
                    };
                  }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

                  if (athletes.length === 0) {
                    return (
                      <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                        <Users className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No athletes have logged workouts yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {athletes.map((athlete) => (
                        <div key={athlete.email} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                          {/* Athlete Header Card */}
                          <div 
                            onClick={() => setExpandedAthlete(expandedAthlete === athlete.email ? null : athlete.email)}
                            className="p-4 active:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">
                                    {athlete.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-white font-bold">{athlete.name}</h3>
                                  {athlete.daysAgo !== null && (
                                    <p className="text-slate-400 text-xs">
                                      {athlete.daysAgo === 0 ? 'Trained today' : 
                                       athlete.daysAgo === 1 ? 'Trained yesterday' :
                                       `Trained ${athlete.daysAgo} days ago`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg 
                                  className={`w-5 h-5 text-slate-400 transition-transform ${
                                    expandedAthlete === athlete.email ? 'rotate-180' : ''
                                  }`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-slate-700 rounded-lg p-2 text-center">
                                <div className="text-white font-bold text-lg">{athlete.total}</div>
                                <div className="text-slate-400 text-xs">Total</div>
                              </div>
                              <div className="bg-slate-700 rounded-lg p-2 text-center">
                                <div className={`font-bold text-lg ${athlete.thisWeek >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {athlete.thisWeek}/7
                                </div>
                                <div className="text-slate-400 text-xs">This Week</div>
                              </div>
                              <div className="bg-slate-700 rounded-lg p-2 text-center">
                                <div className="text-white font-bold text-lg">
                                  {athlete.daysAgo !== null ? athlete.daysAgo : '-'}
                                </div>
                                <div className="text-slate-400 text-xs">Days Ago</div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Workout History */}
                          {expandedAthlete === athlete.email && (
                            <div className="border-t border-slate-700 bg-slate-900">
                              <div className="p-4">
                                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-red-500" />
                                  Workout History
                                </h4>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {athlete.workouts.map((workout) => {
                                    // Find the WOD for this workout to get the name
                                    const wod = allWODs.find(w => w.date === workout.date);
                                    
                                    return (
                                      <div 
                                        key={workout.id}
                                        className="bg-slate-800 rounded-lg p-3 border border-slate-700"
                                      >
                                        {/* WOD Name + Type + Time Header */}
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                              {wod?.name ? (
                                                <h5 className="text-white font-bold text-sm">"{wod.name}"</h5>
                                              ) : workout.customWodName ? (
                                                <h5 className="text-white font-bold text-sm">"{workout.customWodName}"</h5>
                                              ) : (
                                                <h5 className="text-white font-medium text-sm">{workout.customWodType ? 'Custom Workout' : 'Daily WOD'}</h5>
                                              )}
                                              {wod?.type ? (
                                                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                                  {wod.type}
                                                </span>
                                              ) : workout.customWodType && (
                                                <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                                  {workout.customWodType}
                                                </span>
                                              )}
                                              {!wod && workout.customWodName && (
                                                <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                                  Custom
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Calendar className="w-3 h-3 text-red-500" />
                                              <span className="text-slate-400 text-xs">
                                                {new Date(workout.date).toLocaleDateString('en-US', {
                                                  weekday: 'short',
                                                  month: 'short',
                                                  day: 'numeric'
                                                })}
                                              </span>
                                            </div>
                                          </div>
                                          {workout.time && (
                                            <div className="bg-slate-700 px-2 py-1 rounded ml-2">
                                              <span className="text-white text-xs font-bold">{workout.time}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Movements */}
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {workout.movements.map((movement, idx) => (
                                            <div key={idx} className="bg-slate-700 px-2 py-1 rounded text-xs">
                                              <span className="text-white font-medium">{movement.name}</span>
                                              {movement.weight && (
                                                <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>

                                        {/* Photo thumbnail */}
                                        {workout.photoData && (
                                          <img
                                            src={workout.photoData}
                                            alt="Workout"
                                            className="w-full rounded h-32 object-cover mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setPhotoModalUrl(workout.photoData)}
                                          />
                                        )}

                                        {/* Notes */}
                                        {workout.notes && (
                                          <div className="text-slate-400 text-xs italic">
                                            "{workout.notes}"
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
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
                onClick={() => setCoachView('workout')}
                className={`py-3 flex flex-col items-center gap-1 ${
                  coachView === 'workout' ? 'text-red-500' : 'text-slate-400'
                }`}
              >
                <Dumbbell className="w-6 h-6" />
                <span className="text-xs">Log</span>
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
        <PhotoModal />
      </div>
    );
  }

  // Athlete Dashboard
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
              onClick={handleLogout}
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
          </div>

        {/* Dashboard View - Statistics */}
        {currentView === 'dashboard' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-red-600 rounded-2xl p-5">
                <div className="text-red-100 text-xs font-medium tracking-wide mb-1">TOTAL</div>
                <div className="text-4xl font-bold text-white mb-1">{calculateStats().totalWorkouts}</div>
                <div className="text-red-200 text-sm">Workouts</div>
              </div>
              <div className="bg-orange-600 rounded-2xl p-5">
                <div className="text-orange-100 text-xs font-medium tracking-wide mb-1">THIS WEEK</div>
                <div className="text-4xl font-bold text-white mb-1">
                  {calculateStats().currentStreak}/7
                </div>
                <div className="text-orange-200 text-sm">
                  {calculateStats().currentStreak >= 3 ? 'Strong!' : 'WODs'}
                </div>
              </div>
              <div className="bg-blue-600 rounded-2xl p-5">
                <div className="text-blue-100 text-xs font-medium tracking-wide mb-1">THIS MONTH</div>
                <div className="text-4xl font-bold text-white mb-1">{calculateStats().thisMonth}</div>
                <div className="text-blue-200 text-sm">Workouts</div>
              </div>
              <div className="bg-purple-600 rounded-2xl p-5">
                <div className="text-purple-100 text-xs font-medium tracking-wide mb-1">THIS YEAR</div>
                <div className="text-4xl font-bold text-white mb-1">{calculateStats().thisYear}</div>
                <div className="text-purple-200 text-sm">Workouts</div>
              </div>
            </div>

            {/* Quick Action - Today's WOD Status */}
            {todayWOD ? (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 mb-8 border border-slate-700/50 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {todayWOD.name ? `"${todayWOD.name}"` : "Today's WOD"}
                      </h3>
                      <span className="bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                        {todayWOD.type}
                      </span>
                      <span className="bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg capitalize">
                        {todayWOD.group}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm mb-4">
                      Posted by {todayWOD.postedBy}
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      {myResult.existingResultId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Completed
                          </span>
                          {myResult.time && (
                            <span className="text-slate-400 text-sm">• {myResult.time}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-yellow-400 text-sm flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Not logged yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* WOD Details Preview */}
                <div className="bg-slate-700/50 rounded-xl p-4 sm:p-5 mb-5">
                  <div className="space-y-3">
                    {todayWOD.movements.map((movement, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-semibold">{movement.name}</div>
                          <div className="text-slate-300 text-sm">{movement.reps}</div>
                          {movement.notes && (
                            <div className="text-slate-400 text-sm mt-1">{movement.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {todayWOD.notes && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <div className="text-slate-400 text-sm">
                        <span className="font-semibold">Coach Notes:</span> {todayWOD.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setCurrentView('workout')}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-600/25 touch-target-lg"
                >
                  {myResult.existingResultId ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit My Results
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Log My Workout
                    </>
                  )}
                </button>

                {/* Custom Workout Option */}
                {!myResult.existingResultId && (
                  <button
                    onClick={startCustomWorkout}
                    className="w-full mt-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    Did a different workout? Log custom WOD
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 text-center border border-slate-700 mb-6">
                <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-2">No WOD Posted Yet</p>
                <p className="text-slate-400 text-sm mb-4">Your coach hasn't posted today's workout</p>
                <button
                  onClick={startCustomWorkout}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Log Custom Workout
                </button>
              </div>
            )}

            {/* Missed WODs Section */}
            {missedWODs.length > 0 && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 mb-6 border border-amber-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-amber-500/20 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Missed Workouts</h3>
                    <p className="text-slate-400 text-sm">Log results for previous days</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {missedWODs.map((wod) => (
                    <div
                      key={wod.id}
                      className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-amber-400 text-sm font-medium">
                              {new Date(wod.date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="bg-red-600/80 text-white text-xs px-2 py-0.5 rounded">
                              {wod.type}
                            </span>
                          </div>
                          <div className="text-white font-medium mb-1">
                            {wod.name || `${wod.type} Workout`}
                          </div>
                          <div className="text-slate-400 text-sm">
                            {wod.movements.length} movement{wod.movements.length !== 1 ? 's' : ''} • {wod.movements.slice(0, 2).map(m => m.name).join(', ')}{wod.movements.length > 2 ? '...' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => startLogMissedWOD(wod)}
                          className="ml-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          Log
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Movements */}
            {calculateStats().topMovements.length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-5 sm:p-6 mb-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-5">Most Common Movements</h3>
                <div className="space-y-4">
                  {calculateStats().topMovements.map(([movement, count], idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-white font-medium">{movement}</span>
                      </div>
                      <span className="text-slate-400 font-medium">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Recent Workouts</h3>
                {workoutResults.length > 0 && (
                  <button
                    onClick={() => setCurrentView('history')}
                    className="text-red-500 hover:text-red-400 text-sm font-semibold flex items-center gap-1"
                  >
                    View All
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              {workoutResults.length === 0 ? (
                <div className="text-center py-8">
                  <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-base">No workouts logged yet. Time to crush it!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workoutResults.slice(0, 5).map((result) => {
                    // Find the WOD for this workout
                    const wod = allWODs.find(w => w.date === result.date);
                    // Count how many people completed this workout
                    const completedCount = workoutResults.filter(r => r.date === result.date).length;

                    return (
                      <div
                        key={result.id}
                        className="bg-slate-700 rounded-xl border border-slate-600 overflow-hidden"
                      >
                        {/* Delete Confirmation Overlay */}
                        {showDeleteConfirm === result.id && (
                          <div className="bg-red-600 p-5">
                            <p className="text-white font-semibold mb-4">Delete this workout?</p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => deleteWorkout(result.id)}
                                className="flex-1 bg-white text-red-600 py-3 rounded-xl font-semibold touch-target"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 bg-red-700 text-white py-3 rounded-xl font-semibold touch-target"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Main Card Content */}
                        {showDeleteConfirm !== result.id && (
                          <>
                            <div
                              onClick={() => editPastWorkout(result)}
                              className="p-5 active:bg-slate-700/50 transition-colors cursor-pointer"
                            >
                              {/* Header: WOD Name + Type */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {wod?.name ? (
                                      <h4 className="text-white font-bold text-lg">"{wod.name}"</h4>
                                    ) : result.customWodName ? (
                                      <h4 className="text-white font-bold text-lg">"{result.customWodName}"</h4>
                                    ) : (
                                      <h4 className="text-white font-medium">{result.customWodType ? 'Custom Workout' : 'Daily WOD'}</h4>
                                    )}
                                    {wod?.type ? (
                                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                        {wod.type}
                                      </span>
                                    ) : result.customWodType && (
                                      <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                        {result.customWodType}
                                      </span>
                                    )}
                                    {!wod && result.customWodName && (
                                      <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {result.time && (
                                  <div className="bg-slate-700 px-3 py-1.5 rounded-lg ml-2">
                                    <span className="text-white font-bold text-sm">{result.time}</span>
                                  </div>
                                )}
                              </div>

                              {/* Date + Stats Row */}
                              <div className="flex items-center gap-4 mb-3 text-xs">
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3 text-red-500" />
                                  <span className="text-slate-300">
                                    {new Date(result.date).toLocaleDateString('en-US', { 
                                      weekday: 'short', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </div>
                                {wod?.postedBy && (
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <span>Coach: <span className="text-slate-300">{wod.postedBy}</span></span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-slate-400">
                                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span><span className="text-green-400 font-medium">{completedCount}</span> completed</span>
                                </div>
                              </div>

                              {/* Movement Pills */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {result.movements.slice(0, 3).map((movement, idx) => (
                                  <div key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                                    <span className="text-white font-medium">{movement.name}</span>
                                    {movement.weight && (
                                      <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                    )}
                                  </div>
                                ))}
                                {result.movements.length > 3 && (
                                  <div className="bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-400">
                                    +{result.movements.length - 3} more
                                  </div>
                                )}
                              </div>

                              {result.photoData && (
                                <div
                                  className="mt-3 -mx-4 -mb-4 cursor-pointer"
                                  onClick={() => setPhotoModalUrl(result.photoData)}
                                >
                                  <img
                                    src={result.photoData}
                                    alt="Workout"
                                    className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="border-t border-slate-700 grid grid-cols-2">
                              <button
                                onClick={() => editPastWorkout(result)}
                                className="py-3 text-blue-400 hover:bg-slate-700 transition-colors font-medium text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(result.id)}
                                className="py-3 text-red-400 hover:bg-slate-700 transition-colors font-medium text-sm border-l border-slate-700"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {workoutResults.length > 5 && (
                    <button
                      onClick={() => setCurrentView('history')}
                      className="w-full text-center text-red-500 hover:text-red-400 text-sm py-3 font-medium"
                    >
                      View all {workoutResults.length} workouts →
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* History View - All Workouts with Search */}
        {currentView === 'history' && (
          <div>
            {/* Search Bar */}
            <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by workout name or date..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Workout List */}
            {(() => {
              const filteredWorkouts = workoutResults
                .filter(result => {
                  if (!historySearch) return true;
                  const searchLower = historySearch.toLowerCase();
                  const wod = allWODs.find(w => w.date === result.date);
                  const dateStr = new Date(result.date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  }).toLowerCase();
                  return (
                    (wod?.name?.toLowerCase() || '').includes(searchLower) ||
                    dateStr.includes(searchLower)
                  );
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));

              if (filteredWorkouts.length === 0) {
                return (
                  <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
                    <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">
                      {historySearch ? 'No workouts match your search' : 'No workouts logged yet. Time to crush it!'}
                    </p>
                    {!historySearch && todayWOD && (
                      <button
                        onClick={() => setCurrentView('workout')}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Log Today's WOD
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">{filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''} found</p>
                  {filteredWorkouts.map((result) => {
                    const wod = allWODs.find(w => w.date === result.date);
                    const completedCount = workoutResults.filter(r => r.date === result.date).length;
                    
                    return (
                      <div 
                        key={result.id}
                        className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
                      >
                        {/* Delete Confirmation */}
                        {showDeleteConfirm === result.id && (
                          <div className="bg-red-600 p-4">
                            <p className="text-white font-semibold mb-3">Delete this workout?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteWorkout(result.id)}
                                className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {showDeleteConfirm !== result.id && (
                          <>
                            <div
                              onClick={() => editPastWorkout(result)}
                              className="p-4 active:bg-slate-700 transition-colors cursor-pointer"
                            >
                              {/* Header: WOD Name + Type */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {wod?.name ? (
                                      <h4 className="text-white font-bold text-lg">"{wod.name}"</h4>
                                    ) : result.customWodName ? (
                                      <h4 className="text-white font-bold text-lg">"{result.customWodName}"</h4>
                                    ) : (
                                      <h4 className="text-white font-medium">{result.customWodType ? 'Custom Workout' : 'Daily WOD'}</h4>
                                    )}
                                    {wod?.type ? (
                                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                        {wod.type}
                                      </span>
                                    ) : result.customWodType && (
                                      <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded font-semibold">
                                        {result.customWodType}
                                      </span>
                                    )}
                                    {!wod && result.customWodName && (
                                      <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {result.time && (
                                  <div className="bg-slate-700 px-3 py-1 rounded-lg ml-2">
                                    <span className="text-white font-bold text-sm">{result.time}</span>
                                  </div>
                                )}
                              </div>

                              {/* Date + Stats Row */}
                              <div className="flex items-center gap-4 mb-3 text-xs">
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3 text-red-500" />
                                  <span className="text-slate-300">
                                    {new Date(result.date).toLocaleDateString('en-US', { 
                                      weekday: 'short', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </div>
                                {wod?.postedBy && (
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <span>Coach: <span className="text-slate-300">{wod.postedBy}</span></span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-slate-400">
                                  <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span><span className="text-green-400 font-medium">{completedCount}</span> completed</span>
                                </div>
                              </div>

                              {/* Movement Pills */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {result.movements.slice(0, 4).map((movement, idx) => (
                                  <div key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                                    <span className="text-white font-medium">{movement.name}</span>
                                    {movement.weight && (
                                      <span className="text-slate-400 ml-1">@ {movement.weight}</span>
                                    )}
                                  </div>
                                ))}
                                {result.movements.length > 4 && (
                                  <div className="bg-slate-700 px-3 py-1 rounded-full text-sm text-slate-400">
                                    +{result.movements.length - 4} more
                                  </div>
                                )}
                              </div>

                              {result.notes && (
                                <div className="text-slate-400 text-sm mt-2 italic">
                                  "{result.notes}"
                                </div>
                              )}

                              {result.photoData && (
                                <div
                                  className="mt-3 -mx-4 -mb-4 cursor-pointer"
                                  onClick={() => setPhotoModalUrl(result.photoData)}
                                >
                                  <img
                                    src={result.photoData}
                                    alt="Workout"
                                    className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="border-t border-slate-700 grid grid-cols-2">
                              <button
                                onClick={() => editPastWorkout(result)}
                                className="py-3 text-blue-400 hover:bg-slate-700 transition-colors font-medium text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(result.id)}
                                className="py-3 text-red-400 hover:bg-slate-700 transition-colors font-medium text-sm border-l border-slate-700"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Workout View - Today's WOD Logging */}
        {currentView === 'workout' && (
          <>
        {/* Today's WOD */}
        {((todayWOD || editingWorkout) && !isCustomWorkout) ? (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            {editingWorkout && (
              <div className="bg-blue-600 text-white px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">
                      Editing workout from {new Date(editingWorkout.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <button
                    onClick={cancelEdit}
                    className="text-white hover:text-blue-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {!editingWorkout && myResult.existingResultId && todayWOD && (
              <div className="bg-green-600 text-white px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-semibold">Already Logged</span>
                    <p className="text-green-100 text-sm mt-0.5">You can update your time, weights, or notes below</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                {editingWorkout ? 'Edit Workout' : 'Today\'s WOD'}
              </h2>
              <div className="flex gap-2">
                {todayWOD && !editingWorkout && (
                  <>
                    <span className="bg-red-600 text-white text-sm px-3 py-1 rounded">{todayWOD.type}</span>
                    <span className="bg-slate-700 text-white text-sm px-3 py-1 rounded capitalize">{todayWOD.group}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {myResult.movements && myResult.movements.length > 0 ? (
                // Show athlete's logged movements if they exist
                myResult.movements.map((movement, idx) => (
                  <div key={idx} className="bg-slate-700 rounded-lg p-4">
                    <div className="font-bold text-white text-lg mb-1">{movement.name}</div>
                    <div className="text-slate-400 mb-3">
                      {movement.reps}
                      {movement.notes && <span className="text-sm ml-2">({movement.notes})</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="Your weight (e.g., 75lb, scaled, bodyweight)"
                      value={movement.weight || ''}
                      onChange={(e) => updateMovementWeight(idx, e.target.value)}
                      className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                ))
              ) : (
                // Fallback to WOD template if no logged movements
                (editingWorkout ? editingWorkout.movements : todayWOD?.movements || []).map((movement, idx) => (
                  <div key={idx} className="bg-slate-700 rounded-lg p-4">
                    <div className="font-bold text-white text-lg mb-1">{movement.name}</div>
                    <div className="text-slate-400 mb-3">
                      {movement.reps}
                      {movement.notes && <span className="text-sm ml-2">({movement.notes})</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="Your weight (e.g., 75lb, scaled, bodyweight)"
                      value=""
                      onChange={(e) => updateMovementWeight(idx, e.target.value)}
                      className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                ))
              )}
            </div>

            {todayWOD?.notes && !editingWorkout && (
              <div className="bg-slate-700 rounded p-3 mb-4 text-slate-300 text-sm">
                <strong>Coach Notes:</strong> {todayWOD.notes}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Your Time/Score</label>
              <input
                type="text"
                placeholder="e.g., 12:34 or 8 rounds + 15 reps"
                value={myResult.time}
                onChange={(e) => setMyResult({ ...myResult, time: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Add Photo</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
                  <Image className="w-5 h-5" />
                  Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
                  <Image className="w-5 h-5" />
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {myResult.photoData && (
                <div className="relative">
                  <img
                    src={myResult.photoData}
                    alt="Preview"
                    className="w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPhotoModalUrl(myResult.photoData)}
                  />
                  <button
                    onClick={() => setMyResult({ ...myResult, photoData: null })}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Notes</label>
              <textarea
                placeholder="How did it feel? Any modifications?"
                value={myResult.notes}
                onChange={(e) => setMyResult({ ...myResult, notes: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-24"
              />
            </div>

            <button
              onClick={logResult}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {myResult.existingResultId ? 'Update Workout' : 'Log Workout'}
            </button>
            
            {editingWorkout && (
              <button
                onClick={cancelEdit}
                className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        ) : !isCustomWorkout ? (
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-700/50 mb-6">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No WOD posted for today yet.</p>
            <button
              onClick={startCustomWorkout}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Log Custom Workout
            </button>
          </div>
        ) : (
          /* Custom Workout Form */
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Custom Workout</h2>
              <button
                onClick={cancelCustomWorkout}
                className="text-slate-400 hover:text-white p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Workout Name */}
            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Workout Name (optional)</label>
              <input
                type="text"
                placeholder="e.g., Travel WOD, Hotel Workout"
                value={customWod.name}
                onChange={(e) => setCustomWod({ ...customWod, name: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Workout Type */}
            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Workout Type</label>
              <select
                value={customWod.type}
                onChange={(e) => setCustomWod({ ...customWod, type: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
              >
                <option value="For Time">For Time</option>
                <option value="AMRAP">AMRAP</option>
                <option value="EMOM">EMOM</option>
                <option value="Rounds">Rounds</option>
                <option value="Strength">Strength</option>
                <option value="Skill">Skill</option>
                <option value="Chipper">Chipper</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Movements */}
            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Movements</label>
              <div className="space-y-3">
                {customWod.movements.map((movement, idx) => (
                  <div key={idx} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Movement name"
                          value={customMovementInput[idx] || ''}
                          onChange={(e) => handleCustomMovementInput(idx, e.target.value)}
                          onFocus={() => {
                            const newDropdowns = showCustomMovementDropdown.map((_, i) => i === idx && customMovementInput[idx]?.length > 0);
                            setShowCustomMovementDropdown(newDropdowns);
                          }}
                          className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                        />
                        {showCustomMovementDropdown[idx] && (
                          <div className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                            {STANDARD_MOVEMENTS
                              .filter(m => m.toLowerCase().includes((customMovementInput[idx] || '').toLowerCase()))
                              .slice(0, 8)
                              .map((m) => (
                                <button
                                  key={m}
                                  onClick={() => selectCustomMovement(idx, m)}
                                  className="w-full text-left px-3 py-2 text-white hover:bg-slate-700"
                                >
                                  {m}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      {customWod.movements.length > 1 && (
                        <button
                          onClick={() => removeCustomMovement(idx)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Reps (e.g., 21-15-9, 10 rounds)"
                      value={movement.reps}
                      onChange={(e) => updateCustomMovement(idx, 'reps', e.target.value)}
                      className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addCustomMovement}
                className="mt-3 text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Movement
              </button>
            </div>

            {/* Time Result */}
            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Your Time / Score</label>
              <input
                type="text"
                placeholder="e.g., 12:30, 5 rounds + 10 reps"
                value={myResult.time}
                onChange={(e) => setMyResult({ ...myResult, time: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-slate-300 mb-2">Notes</label>
              <textarea
                placeholder="How did it feel? Any modifications?"
                value={myResult.notes}
                onChange={(e) => setMyResult({ ...myResult, notes: e.target.value })}
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none h-24"
              />
            </div>

            {/* Photo Upload */}
            <div className="mb-6">
              <label className="block text-slate-300 mb-2">Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full text-slate-400"
              />
              {myResult.photoData && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={myResult.photoData}
                    alt="Workout"
                    className="h-24 rounded"
                  />
                  <button
                    onClick={() => setMyResult({ ...myResult, photoData: null })}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={logCustomWorkout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Log Custom Workout
            </button>

            <button
              onClick={cancelCustomWorkout}
              className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
          </>
        )}
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal />
    </div>
  );
}
