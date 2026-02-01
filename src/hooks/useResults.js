import { useState } from 'react';
import * as db from '../lib/database';
import { isBenchmarkWod, getBenchmarkByName } from '../lib/benchmarks';
import { STANDARD_MOVEMENTS } from '../lib/constants';

export function useResults(currentUser) {
  const [workoutResults, setWorkoutResults] = useState([]);
  const [allAthleteResults, setAllAthleteResults] = useState([]);
  const [myResult, setMyResult] = useState({
    time: '',
    movements: [],
    notes: '',
    photoData: null,
    rx: true,
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

      const today = new Date().toISOString().split('T')[0];
      const todayResult = myResults.find(r => r.date === today);

      if (todayResult) {
        const isCustom = !!(todayResult.customWodName || todayResult.customWodType);
        const matchesCurrentWod = isCustom || !currentWOD || todayResult.wodId === currentWOD.id;

        if (matchesCurrentWod) {
          setMyResult({
            time: todayResult.time,
            movements: todayResult.movements,
            notes: todayResult.notes,
            photoData: todayResult.photoData,
            rx: todayResult.rx !== undefined ? todayResult.rx : true,
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
            rx: true,
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
          rx: true,
        });
      }

      return myResults;
    } catch (error) {
      console.log('No results yet', error);
      return [];
    }
  };

  const loadAllResults = async () => {
    try {
      const resultsData = await db.getAllResults();
      const allResults = resultsData.map(r => db.resultToAppFormat(r));
      setAllAthleteResults(allResults);
    } catch (error) {
      console.log('Error loading results:', error);
      setAllAthleteResults([]);
    }
  };

  const logResult = async (todayWOD, allWODs, onSuccess) => {
    if (!todayWOD && !editingWorkout) return;

    const workoutDate = editingWorkout ? editingWorkout.date : todayWOD.date;
    const wodId = editingWorkout?.wodId || todayWOD?.id;
    const wasUpdate = !!myResult.existingResultId;

    const resultData = {
      wodId,
      date: workoutDate,
      time: myResult.time,
      movements: myResult.movements,
      notes: myResult.notes,
      photoData: myResult.photoData,
      rx: myResult.rx !== undefined ? myResult.rx : true,
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

      const results = await loadMyResults();
      await loadAllResults();

      if (onSuccess) await onSuccess(results);

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

    const today = new Date().toISOString().split('T')[0];
    const wasUpdate = !!myResult.existingResultId;

    const resultData = {
      wodId: null,
      date: today,
      time: myResult.time,
      movements: validMovements.map(m => ({ ...m, weight: '' })),
      notes: myResult.notes,
      photoData: myResult.photoData,
      rx: myResult.rx !== undefined ? myResult.rx : true,
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

      const results = await loadMyResults();
      await loadAllResults();

      if (onSuccess) await onSuccess(results);

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
      rx: true,
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
      rx: true,
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

  const editPastWorkout = (result, navigate) => {
    setEditingWorkout(result);
    setMyResult({
      time: result.time,
      movements: result.movements,
      notes: result.notes,
      photoData: result.photoData,
      rx: result.rx !== undefined ? result.rx : true,
      existingResultId: result.id
    });
    if (navigate) navigate('workout');
  };

  const deleteWorkout = async (workoutId) => {
    try {
      await db.deleteResult(workoutId);
      await loadMyResults();
      await loadAllResults();
      setShowDeleteConfirm(null);
    } catch (error) {
      alert('Error deleting workout: ' + error.message);
    }
  };

  const cancelEdit = (todayWOD, navigate) => {
    setEditingWorkout(null);
    if (todayWOD) {
      const today = new Date().toISOString().split('T')[0];
      const todayResult = workoutResults.find(r => r.date === today);
      if (todayResult) {
        const isCustom = !!(todayResult.customWodName || todayResult.customWodType);
        setMyResult({
          time: todayResult.time,
          movements: todayResult.movements,
          notes: todayResult.notes,
          photoData: todayResult.photoData,
          rx: todayResult.rx !== undefined ? todayResult.rx : true,
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
          rx: true,
        });
      }
    }
    if (navigate) navigate('dashboard');
  };

  const updateMovementWeight = (index, weight) => {
    const updated = [...myResult.movements];
    updated[index].weight = weight;
    setMyResult({ ...myResult, movements: updated });
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
