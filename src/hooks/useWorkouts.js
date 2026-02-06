import { useState, useEffect } from 'react';
import * as db from '../lib/database';
import { STANDARD_MOVEMENTS, getLocalToday } from '../lib/constants';

export function useWorkouts(currentUser) {
  const [allWODs, setAllWODs] = useState([]);
  const [todayWOD, setTodayWOD] = useState(null);
  const [missedWODs, setMissedWODs] = useState([]);
  const [showWODForm, setShowWODForm] = useState(false);
  const [newWOD, setNewWOD] = useState({
    name: '',
    date: getLocalToday(),
    type: 'For Time',
    group: 'combined',
    movements: [{ name: '', reps: '', notes: '' }],
    notes: ''
  });
  const [movementInput, setMovementInput] = useState(['']);
  const [showMovementDropdown, setShowMovementDropdown] = useState([false]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [editingWOD, setEditingWOD] = useState(null);
  const [showDeleteWODConfirm, setShowDeleteWODConfirm] = useState(null);
  const [wodPhotoData, setWodPhotoData] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(
    currentUser ? { id: currentUser.id, name: currentUser.name } : null
  );

  useEffect(() => {
    if (currentUser?.role === 'coach') {
      db.getAllCoaches()
        .then(setCoaches)
        .catch(err => console.error('Error loading coaches:', err));
    }
  }, [currentUser?.id, currentUser?.role]);

  const handleWodPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setWodPhotoData(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadTodayWOD = async () => {
    if (!currentUser) return null;

    try {
      const wodData = await db.getTodayWod(currentUser.group, currentUser.role);
      if (wodData) {
        const wod = db.wodToAppFormat(wodData);
        setTodayWOD(wod);
        return wod;
      } else {
        setTodayWOD(null);
        return null;
      }
    } catch {
      // No WOD posted for today — expected
      setTodayWOD(null);
      return null;
    }
  };

  const loadAllWODs = async () => {
    try {
      const wodsData = await db.getAllWods();
      const wods = wodsData.map(w => db.wodToAppFormat(w));
      setAllWODs(wods);
      return wods;
    } catch (error) {
      console.error('Error loading WODs:', error);
      setAllWODs([]);
      return [];
    }
  };

  const loadMissedWODs = async (userResults, fallbackResults) => {
    if (!currentUser) return;

    try {
      const recentWodsData = await db.getRecentWods(currentUser.group, 7);
      const recentWods = recentWodsData.map(w => db.wodToAppFormat(w));

      const results = userResults || fallbackResults || [];
      const loggedDates = new Set(results.map(r => r.date));

      const missed = recentWods.filter(wod => !loggedDates.has(wod.date));
      setMissedWODs(missed);
    } catch (error) {
      console.error('Error loading missed WODs:', error);
      setMissedWODs([]);
    }
  };

  const addSectionHeader = () => {
    const header = { name: '', reps: '', notes: '', type: 'header' };
    const hasHeader = newWOD.movements.some(m => m.type === 'header');
    if (!hasHeader) {
      setNewWOD({ ...newWOD, movements: [header, ...newWOD.movements] });
      setMovementInput(['', ...movementInput]);
      setShowMovementDropdown([false, ...showMovementDropdown]);
    } else {
      setNewWOD({ ...newWOD, movements: [...newWOD.movements, header] });
      setMovementInput([...movementInput, '']);
      setShowMovementDropdown([...showMovementDropdown, false]);
    }
  };

  const postWOD = async (onSuccess) => {
    const hasRealMovement = newWOD.movements.some(m => m.type !== 'header' && m.name);
    if (!hasRealMovement) {
      alert('Please add at least one movement');
      return;
    }

    try {
      const conflictCheck = await db.checkWodConflict(newWOD.date, newWOD.group, editingWOD?.id);
      if (conflictCheck.conflict) {
        alert(conflictCheck.message);
        return;
      }

      const wodWithPhoto = { ...newWOD, photoData: wodPhotoData };

      const coach = selectedCoach || { id: currentUser.id, name: currentUser.name };

      if (editingWOD) {
        await db.updateWod(editingWOD.id, wodWithPhoto, coach.id, coach.name);
      } else {
        await db.createWod(wodWithPhoto, coach.id, coach.name);
      }

      const action = editingWOD ? 'updated' : 'posted';
      alert(`WOD ${action} successfully!`);
      setShowWODForm(false);
      setEditingWOD(null);
      setWodPhotoData(null);
      setSelectedCoach({ id: currentUser.id, name: currentUser.name });
      setNewWOD({
        name: '',
        date: getLocalToday(),
        type: 'For Time',
        group: 'combined',
        movements: [{ name: '', reps: '', notes: '' }],
        notes: ''
      });
      setMovementInput(['']);
      setShowMovementDropdown([false]);
      await loadAllWODs();
      await loadTodayWOD();
      if (onSuccess) await onSuccess();
    } catch (error) {
      alert('Error posting WOD: ' + error.message);
    }
  };

  const editWOD = (wod, navigate) => {
    setEditingWOD(wod);
    setNewWOD({
      name: wod.name || '',
      date: wod.date,
      type: wod.type,
      group: wod.group,
      movements: wod.movements,
      notes: wod.notes
    });
    setWodPhotoData(wod.photoData || null);
    setMovementInput(wod.movements.map(m => m.name));
    setShowMovementDropdown(wod.movements.map(() => false));
    if (wod.postedById) {
      setSelectedCoach({ id: wod.postedById, name: wod.postedBy });
    }
    setShowWODForm(true);
    if (navigate) navigate('program');
  };

  const deleteWOD = async (wod, allAthleteResults) => {
    const athleteResults = allAthleteResults.filter(r =>
      r.date === wod.date && r.athleteEmail !== currentUser.email
    );

    if (athleteResults.length > 0) {
      alert(`Cannot delete this WOD. ${athleteResults.length} athlete${athleteResults.length !== 1 ? 's have' : ' has'} already logged results for this workout.`);
      return;
    }

    setShowDeleteWODConfirm({ ...wod });
  };

  const confirmDeleteWOD = async (workoutResults, onSuccess) => {
    if (!showDeleteWODConfirm) return;

    const wod = showDeleteWODConfirm;

    const coachResult = workoutResults.find(r =>
      r.date === wod.date && r.athleteEmail === currentUser.email
    );

    try {
      if (coachResult) {
        await db.deleteResult(coachResult.id);
      }

      await db.deleteWod(wod.id);

      await loadAllWODs();
      await loadTodayWOD();
      if (onSuccess) await onSuccess();

      setShowDeleteWODConfirm(null);
      alert('WOD deleted successfully');
    } catch (error) {
      alert('Error deleting WOD: ' + error.message);
      setShowDeleteWODConfirm(null);
    }
  };

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

  const reorderMovement = (fromIndex, toIndex) => {
    const reorder = (arr) => {
      const result = [...arr];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    };

    setNewWOD({ ...newWOD, movements: reorder(newWOD.movements) });
    setMovementInput(reorder(movementInput));
    setShowMovementDropdown(reorder(showMovementDropdown));
  };

  return {
    allWODs, setAllWODs,
    todayWOD, setTodayWOD,
    missedWODs,
    showWODForm, setShowWODForm,
    newWOD, setNewWOD,
    movementInput, setMovementInput,
    showMovementDropdown, setShowMovementDropdown,
    filteredMovements,
    editingWOD, setEditingWOD,
    showDeleteWODConfirm, setShowDeleteWODConfirm,
    wodPhotoData, setWodPhotoData,
    handleWodPhotoUpload,
    coaches,
    selectedCoach, setSelectedCoach,
    loadTodayWOD,
    loadAllWODs,
    loadMissedWODs,
    postWOD,
    editWOD,
    deleteWOD,
    confirmDeleteWOD,
    addMovement,
    addSectionHeader,
    updateMovement,
    handleMovementInput,
    selectMovement,
    removeMovement,
    reorderMovement,
  };
}
