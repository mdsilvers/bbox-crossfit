import { useState, useCallback } from 'react';
import * as db from '../lib/database';

const WEIGHT_INCREMENT = 2.5; // kg

export function roundToNearest(value, increment = WEIGHT_INCREMENT) {
  return Math.round(value / increment) * increment;
}

export function calculateWorkingWeight(oneRepMax, percentage) {
  const raw = oneRepMax * (percentage / 100);
  return roundToNearest(raw);
}

export function useStrengthProgram(currentUser) {
  const [activeProgram, setActiveProgram] = useState(null);
  const [allPrograms, setAllPrograms] = useState([]);
  const [programSessions, setProgramSessions] = useState([]);
  const [myEnrollment, setMyEnrollment] = useState(null);
  const [allEnrollments, setAllEnrollments] = useState([]);

  // ==================== PROGRAM MANAGEMENT (Coach) ====================

  const loadAllPrograms = useCallback(async () => {
    try {
      const data = await db.getAllPrograms();
      setAllPrograms(data);
      return data;
    } catch (error) {
      console.error('Error loading programs:', error);
      return [];
    }
  }, []);

  const loadActiveProgram = useCallback(async () => {
    try {
      const program = await db.getActiveProgram();
      setActiveProgram(program);
      if (program) {
        const sessions = await db.getSessionsForProgram(program.id);
        setProgramSessions(sessions);
      } else {
        setProgramSessions([]);
      }
      return program;
    } catch (error) {
      console.error('Error loading active program:', error);
      return null;
    }
  }, []);

  // Pure fetch — deliberately does NOT touch the programSessions state.
  // programSessions always holds the ACTIVE program's sessions (used by
  // getMySession / Part A display); browsing another program in the manager
  // was overwriting it and breaking working-weight display everywhere.
  const loadSessionsForProgram = useCallback(async (programId) => {
    try {
      return await db.getSessionsForProgram(programId);
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }, []);

  const createProgram = useCallback(async (programData, sessions) => {
    if (!currentUser) return null;
    try {
      const program = await db.createProgram(programData, currentUser.id, currentUser.name);
      if (sessions && sessions.length > 0) {
        await db.upsertProgramSessions(program.id, sessions);
      }
      await loadAllPrograms();
      return program;
    } catch (error) {
      console.error('Error creating program:', error);
      throw error;
    }
  }, [currentUser, loadAllPrograms]);

  const updateProgram = useCallback(async (id, programData, sessions) => {
    try {
      const program = await db.updateProgram(id, programData);
      if (sessions) {
        await db.upsertProgramSessions(id, sessions);
      }
      await loadAllPrograms();
      if (activeProgram?.id === id) {
        await loadActiveProgram();
      }
      return program;
    } catch (error) {
      console.error('Error updating program:', error);
      throw error;
    }
  }, [activeProgram, loadAllPrograms, loadActiveProgram]);

  const activateProgram = useCallback(async (id) => {
    try {
      await db.activateProgram(id);
      await loadActiveProgram();
      await loadAllPrograms();
    } catch (error) {
      console.error('Error activating program:', error);
      throw error;
    }
  }, [loadActiveProgram, loadAllPrograms]);

  const deactivateProgram = useCallback(async (id) => {
    try {
      await db.deactivateProgram(id);
      setActiveProgram(null);
      setProgramSessions([]);
      await loadAllPrograms();
    } catch (error) {
      console.error('Error deactivating program:', error);
      throw error;
    }
  }, [loadAllPrograms]);

  const deleteProgramById = useCallback(async (id) => {
    try {
      await db.deleteProgram(id);
      if (activeProgram?.id === id) {
        setActiveProgram(null);
        setProgramSessions([]);
      }
      await loadAllPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      throw error;
    }
  }, [activeProgram, loadAllPrograms]);

  // ==================== ENROLLMENT (Athlete) ====================

  const loadMyEnrollment = useCallback(async (programId) => {
    if (!currentUser || !programId) {
      setMyEnrollment(null);
      return null;
    }
    try {
      const enrollment = await db.getMyEnrollment(programId, currentUser.id);
      setMyEnrollment(enrollment);
      return enrollment;
    } catch (error) {
      console.error('Error loading enrollment:', error);
      return null;
    }
  }, [currentUser]);

  const loadAllEnrollments = useCallback(async (programId) => {
    if (!programId) return [];
    try {
      const data = await db.getAllEnrollments(programId);
      setAllEnrollments(data);
      return data;
    } catch (error) {
      console.error('Error loading enrollments:', error);
      return [];
    }
  }, []);

  const enroll = useCallback(async (programId, oneRepMax) => {
    if (!currentUser) return null;
    try {
      const enrollment = await db.enrollAthlete(programId, currentUser.id, oneRepMax);
      setMyEnrollment(enrollment);
      return enrollment;
    } catch (error) {
      console.error('Error enrolling:', error);
      throw error;
    }
  }, [currentUser]);

  const updateMyOneRepMax = useCallback(async (oneRepMax) => {
    if (!myEnrollment) return null;
    try {
      const updated = await db.updateOneRepMax(myEnrollment.id, oneRepMax);
      setMyEnrollment(updated);
      return updated;
    } catch (error) {
      console.error('Error updating 1RM:', error);
      throw error;
    }
  }, [myEnrollment]);

  const advanceMySession = useCallback(async () => {
    if (!myEnrollment || !activeProgram) return null;
    try {
      const updated = await db.advanceSession(
        myEnrollment.id, myEnrollment.current_session, activeProgram.total_sessions
      );
      setMyEnrollment(updated);
      return updated;
    } catch (error) {
      console.error('Error advancing session:', error);
      throw error;
    }
  }, [myEnrollment, activeProgram]);

  // ==================== COACH OVERRIDE ====================

  const overrideAllToSession = useCallback(async (sessionNumber) => {
    if (!activeProgram) return;
    try {
      await db.overrideAllEnrollments(activeProgram.id, sessionNumber);
      await loadAllEnrollments(activeProgram.id);
      if (myEnrollment) {
        await loadMyEnrollment(activeProgram.id);
      }
    } catch (error) {
      console.error('Error overriding sessions:', error);
      throw error;
    }
  }, [activeProgram, myEnrollment, loadAllEnrollments, loadMyEnrollment]);

  // ==================== SESSION RESOLUTION ====================

  const getMySession = useCallback((wod) => {
    if (!activeProgram || !programSessions.length) return null;
    if (!wod?.strengthProgramId) return null;

    // Coach override on the WOD takes priority
    if (wod.programSessionOverride) {
      return programSessions.find(s => s.session_number === wod.programSessionOverride) || null;
    }

    // Otherwise use athlete's current session from enrollment
    if (!myEnrollment) return null;
    return programSessions.find(s => s.session_number === myEnrollment.current_session) || null;
  }, [activeProgram, programSessions, myEnrollment]);

  const getMyWorkingWeight = useCallback((session) => {
    if (!session || !myEnrollment) return null;
    return calculateWorkingWeight(parseFloat(myEnrollment.one_rep_max), parseFloat(session.percentage));
  }, [myEnrollment]);

  return {
    activeProgram, allPrograms, programSessions, myEnrollment, allEnrollments,
    loadAllPrograms, loadActiveProgram, loadSessionsForProgram,
    createProgram, updateProgram, activateProgram, deactivateProgram, deleteProgramById,
    loadMyEnrollment, loadAllEnrollments, enroll, updateMyOneRepMax, advanceMySession,
    overrideAllToSession, getMySession, getMyWorkingWeight,
  };
}
