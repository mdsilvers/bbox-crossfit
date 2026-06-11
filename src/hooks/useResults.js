import { useState } from 'react';
import * as db from '../lib/database';
import { isBenchmarkWod, getBenchmarkByName } from '../lib/benchmarks';
import { STANDARD_MOVEMENTS, getLocalToday } from '../lib/constants';

// Upsert a result into a sorted-by-date-desc list, replacing any existing
// entry with the same id OR the same (athleteId, date) pair — the DB has
// a UNIQUE (athlete_id, date) constraint, so both keys identify the same row.
function upsertResult(list, saved) {
  const filtered = list.filter(r =>
    r.id !== saved.id && !(r.athleteId === saved.athleteId && r.date === saved.date)
  );
  const next = [saved, ...filtered];
  next.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return next;
}

function removeResult(list, id) {
  return list.filter(r => r.id !== id);
}

export function useResults(currentUser) {
  const [workoutResults, setWorkoutResults] = useState([]);
  const [allAthleteResults, setAllAthleteResults] = useState([]);
  const [myResult, setMyResult] = useState({
    time: '',
    movements: [],
    notes: '',
    photoData: null,
    rx: 'rx',
    strengthScore: '',
  });
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isCustomWorkout, setIsCustomWorkout] = useState(false);
  const [postWodSummaryData, setPostWodSummaryData] = useState(null);
  const [customWod, setCustomWod] = useState({
    name: '',
    type: 'For Time',
    movements: [{ name: '', reps: '', notes: '' }]
  });
  const [customMovementInput, setCustomMovementInput] = useState(['']);
  const [showCustomMovementDropdown, setShowCustomMovementDropdown] = useState([false]);
  const [customWodNameError, setCustomWodNameError] = useState('');
  const [photoModalUrl, setPhotoModalUrl] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMyResult(prev => ({ ...prev, photoData: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const loadMyResults = async (wod = null, todayWOD = null) => {
    if (!currentUser) return [];

    const currentWOD = wod || todayWOD;

    try {
      const resultsData = await db.getResultsByAthlete(currentUser.id);
      const myResults = resultsData.map(r => db.resultToAppFormat(r));
      setWorkoutResults(myResults);

      const today = getLocalToday();
      const todayResult = myResults.find(r => r.date === today);

      if (todayResult) {
        const isCustom = !!(todayResult.customWodName || todayResult.customWodType);
        const matchesCurrentWod = isCustom || !currentWOD || todayResult.wodId === currentWOD.id;

        if (matchesCurrentWod) {
          // Photo was stripped from the list query — fetch so the form can keep it.
          let photoData = todayResult.photoData;
          if (!photoData && todayResult.hasPhoto) {
            try { photoData = await db.getResultPhoto(todayResult.id); } catch { /* non-fatal */ }
          }
          setMyResult({
            time: todayResult.time,
            movements: todayResult.movements,
            notes: todayResult.notes,
            photoData,
            rx: todayResult.rx ?? 'rx',
            strengthScore: todayResult.strengthScore || '',
            existingResultId: todayResult.id,
            isCustomResult: isCustom,
            customWodName: todayResult.customWodName,
            customWodType: todayResult.customWodType,
          });
        } else if (currentWOD) {
          // Result exists for today but for a different WOD — show current WOD
          // as not completed. Keep existingResultId so logging updates rather
          // than inserts (unique constraint on athlete_id + date).
          setMyResult({
            time: '',
            movements: currentWOD.movements.map(m => ({ ...m, weight: '' })),
            notes: '',
            photoData: null,
            rx: 'rx',
            strengthScore: '',
            existingResultId: todayResult.id,
            existingResultForDifferentWod: true,
          });
        }
      } else if (currentWOD) {
        setMyResult({
          time: '',
          movements: currentWOD.movements.map(m => ({ ...m, weight: '' })),
          notes: '',
          photoData: null,
          rx: 'rx',
          strengthScore: '',
        });
      }

      return myResults;
    } catch (error) {
      console.error('Error loading results:', error);
      return [];
    }
  };

  const loadAllResults = async () => {
    try {
      const resultsData = await db.getAllResults();
      const allResults = resultsData.map(r => db.resultToAppFormat(r));
      setAllAthleteResults(allResults);
    } catch (error) {
      console.error('Error loading all results:', error);
      setAllAthleteResults([]);
    }
  };

  const logResult = async (todayWOD, allWODs, onSuccess) => {
    if (!todayWOD && !editingWorkout) return;

    const workoutDate = editingWorkout ? editingWorkout.date : todayWOD.date;
    const wodId = editingWorkout?.wodId || todayWOD?.id;
    const wasUpdate = !!myResult.existingResultId;
    // True only when re-saving an existing result for the same WOD. A row
    // updated because today's slot held a different WOD's result still counts
    // as a first log (unique constraint on athlete_id + date forces an update).
    const isEdit = wasUpdate && !myResult.existingResultForDifferentWod;

    const resultData = {
      wodId,
      date: workoutDate,
      time: myResult.time,
      movements: myResult.movements,
      notes: myResult.notes,
      photoData: myResult.photoData,
      rx: myResult.rx || 'rx',
      strengthScore: myResult.strengthScore || null,
    };

    try {
      let savedRow;
      if (myResult.existingResultId) {
        savedRow = await db.updateResult(myResult.existingResultId, resultData);
      } else {
        savedRow = await db.createResult(resultData, currentUser.id, currentUser.name, currentUser.email);
      }

      const savedResult = db.resultToAppFormat(savedRow);
      const matchingWod = allWODs.find(w => w.id === wodId) || todayWOD;

      setPostWodSummaryData({
        result: savedResult,
        wod: matchingWod,
        isCustomWorkout: false,
        isUpdate: wasUpdate,
        mode: 'post-log',
      });

      const updatedMyResults = upsertResult(workoutResults, savedResult);
      setWorkoutResults(updatedMyResults);
      setAllAthleteResults(prev => upsertResult(prev, savedResult));

      // Mirror loadMyResults' form-reset side effect so the next render reflects today's saved result
      const today = getLocalToday();
      if (savedResult.date === today) {
        const isCustom = !!(savedResult.customWodName || savedResult.customWodType);
        setMyResult({
          time: savedResult.time,
          movements: savedResult.movements,
          notes: savedResult.notes,
          photoData: savedResult.photoData,
          rx: savedResult.rx ?? 'rx',
          strengthScore: savedResult.strengthScore || '',
          existingResultId: savedResult.id,
          isCustomResult: isCustom,
          customWodName: savedResult.customWodName,
          customWodType: savedResult.customWodType,
        });
      }

      if (onSuccess) await onSuccess(updatedMyResults, { isEdit, wodId });

      if (editingWorkout) {
        setEditingWorkout(null);
      }
    } catch (error) {
      alert('Error logging workout: ' + error.message);
    }
  };

  const logCustomWorkout = async (allWODs, onSuccess) => {
    if (customWod.name && isBenchmarkWod(customWod.name)) {
      const benchmark = getBenchmarkByName(customWod.name);
      alert(`"${benchmark.name}" is a benchmark WOD name. Please use a different name for your custom workout, or log it as the official benchmark when a coach posts it.`);
      return;
    }

    const validMovements = customWod.movements.filter(m => m.name.trim());
    if (validMovements.length === 0) {
      alert('Please add at least one movement to your workout');
      return;
    }

    const today = getLocalToday();
    const wasUpdate = !!myResult.existingResultId;

    const resultData = {
      wodId: null,
      date: today,
      time: myResult.time,
      movements: validMovements.map(m => ({ ...m, weight: '' })),
      notes: myResult.notes,
      photoData: myResult.photoData,
      rx: myResult.rx || 'rx',
      customWodName: customWod.name || null,
      customWodType: customWod.type,
    };

    try {
      let savedRow;
      if (myResult.existingResultId) {
        savedRow = await db.updateResult(myResult.existingResultId, resultData);
      } else {
        savedRow = await db.createResult(resultData, currentUser.id, currentUser.name, currentUser.email);
      }

      const savedResult = db.resultToAppFormat(savedRow);

      setPostWodSummaryData({
        result: savedResult,
        wod: null,
        isCustomWorkout: true,
        isUpdate: wasUpdate,
        mode: 'post-log',
      });

      const updatedMyResults = upsertResult(workoutResults, savedResult);
      setWorkoutResults(updatedMyResults);
      setAllAthleteResults(prev => upsertResult(prev, savedResult));

      // Mirror loadMyResults' form-reset side effect
      if (savedResult.date === today) {
        setMyResult({
          time: savedResult.time,
          movements: savedResult.movements,
          notes: savedResult.notes,
          photoData: savedResult.photoData,
          rx: savedResult.rx ?? 'rx',
          strengthScore: savedResult.strengthScore || '',
          existingResultId: savedResult.id,
          isCustomResult: true,
          customWodName: savedResult.customWodName,
          customWodType: savedResult.customWodType,
        });
      }

      if (onSuccess) await onSuccess(updatedMyResults);

      setIsCustomWorkout(false);
      setCustomWod({
        name: '',
        type: 'For Time',
        movements: [{ name: '', reps: '', notes: '' }]
      });
      setCustomWodNameError('');
    } catch (error) {
      alert('Error logging custom workout: ' + error.message);
    }
  };

  const startLogMissedWOD = (wod, navigate) => {
    setEditingWorkout({
      ...wod,
      wodId: wod.id,
      movements: wod.movements
    });
    setMyResult({
      time: '',
      movements: wod.movements.map(m => ({ ...m, weight: '' })),
      notes: '',
      photoData: null,
      rx: 'rx',
      strengthScore: '',
    });
    setIsCustomWorkout(false);
    if (navigate) navigate('workout');
  };

  const startCustomWorkout = (navigate) => {
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
      photoData: null,
      rx: 'rx',
      strengthScore: '',
    });
    if (navigate) navigate('workout');
  };

  const cancelCustomWorkout = (navigate) => {
    setIsCustomWorkout(false);
    setCustomWod({
      name: '',
      type: 'For Time',
      movements: [{ name: '', reps: '', notes: '' }]
    });
    setCustomMovementInput(['']);
    setShowCustomMovementDropdown([false]);
    setCustomWodNameError('');
    if (navigate) navigate('dashboard');
  };

  const editPastWorkout = async (result, navigate) => {
    setEditingWorkout(result);
    // Photo was stripped from the list query — fetch on demand so it isn't lost on save.
    let photoData = result.photoData;
    if (!photoData && result.hasPhoto) {
      try {
        photoData = await db.getResultPhoto(result.id);
      } catch (error) {
        console.error('Error fetching result photo:', error);
      }
    }
    setMyResult({
      time: result.time,
      movements: result.movements,
      notes: result.notes,
      photoData,
      rx: result.rx ?? 'rx',
      strengthScore: result.strengthScore || '',
      existingResultId: result.id
    });
    if (navigate) navigate('workout');
  };

  const deleteWorkout = async (workoutId) => {
    try {
      await db.deleteResult(workoutId);
      setWorkoutResults(prev => removeResult(prev, workoutId));
      setAllAthleteResults(prev => removeResult(prev, workoutId));

      // If we just deleted today's result, reset the form so the user can log again.
      if (myResult.existingResultId === workoutId) {
        setMyResult({
          time: '',
          movements: [],
          notes: '',
          photoData: null,
          rx: 'rx',
          strengthScore: '',
        });
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      alert('Error deleting workout: ' + error.message);
    }
  };

  const cancelEdit = (todayWOD, navigate) => {
    setEditingWorkout(null);
    if (todayWOD) {
      const today = getLocalToday();
      const todayResult = workoutResults.find(r => r.date === today);
      if (todayResult) {
        const isCustom = !!(todayResult.customWodName || todayResult.customWodType);
        setMyResult({
          time: todayResult.time,
          movements: todayResult.movements,
          notes: todayResult.notes,
          photoData: todayResult.photoData,
          rx: todayResult.rx ?? 'rx',
          strengthScore: todayResult.strengthScore || '',
          existingResultId: todayResult.id,
          isCustomResult: isCustom,
          customWodName: todayResult.customWodName,
          customWodType: todayResult.customWodType,
        });
      } else {
        setMyResult({
          time: '',
          movements: todayWOD.movements.map(m => ({ ...m, weight: '' })),
          notes: '',
          photoData: null,
          rx: 'rx',
          strengthScore: '',
        });
      }
    }
    if (navigate) navigate('dashboard');
  };

  const updateMovementWeight = (index, weight, templateMovements) => {
    setMyResult(prev => {
      let movements = [...prev.movements];
      // Initialize from template if movements not yet populated
      if (movements.length === 0 && templateMovements) {
        movements = templateMovements.map(m => ({ ...m, weight: '' }));
      }
      if (movements[index]) {
        movements[index] = { ...movements[index], weight };
      }
      return { ...prev, movements };
    });
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

    updateCustomMovement(index, 'name', value);

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

  const showWorkoutSummary = (result, allWODs = []) => {
    const isCustom = !!(result.customWodName || result.customWodType);
    let wod = null;
    if (!isCustom) {
      wod = result.wodId ? allWODs.find(w => w.id === result.wodId) : null;
      if (!wod || wod.date !== result.date) {
        wod = allWODs.find(w => w.date === result.date) || wod;
      }
    }
    setPostWodSummaryData({
      result,
      wod,
      isCustomWorkout: isCustom,
      isUpdate: false,
      mode: 'detail',
    });
  };

  const showWodReview = (wod) => {
    setPostWodSummaryData({
      result: null,
      wod,
      isCustomWorkout: false,
      isUpdate: false,
      mode: 'detail',
    });
  };

  return {
    workoutResults, setWorkoutResults,
    allAthleteResults, setAllAthleteResults,
    myResult, setMyResult,
    editingWorkout, setEditingWorkout,
    showDeleteConfirm, setShowDeleteConfirm,
    isCustomWorkout, setIsCustomWorkout,
    customWod, setCustomWod,
    customMovementInput, setCustomMovementInput,
    showCustomMovementDropdown, setShowCustomMovementDropdown,
    customWodNameError, setCustomWodNameError,
    photoModalUrl, setPhotoModalUrl,
    postWodSummaryData, setPostWodSummaryData,
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
    showWorkoutSummary,
    showWodReview,
  };
}
