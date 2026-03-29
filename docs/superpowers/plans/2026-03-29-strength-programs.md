# Strength Programs (Multi-Part WODs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow coaches to define multi-week strength programs (e.g., Old School Squat Routine) that auto-attach as Part A of daily WODs, with personalized weights calculated from each athlete's 1RM.

**Architecture:** New `strength_programs`, `program_sessions`, and `athlete_enrollments` tables store program definitions and athlete progress. WODs gain an optional `strength_program_id` FK to attach the active program as Part A. Results gain a `strength_score` column for Part A scoring. A new `useStrengthProgram` hook manages program CRUD, enrollment, and session progression. Completion-based progression advances athletes through sessions, with coach override available per-WOD.

**Tech Stack:** React 19, Supabase (PostgreSQL + RLS), Tailwind CSS v4, existing hook architecture

---

## Decisions & Constraints

- **One active program at a time** across the whole box
- **All athletes participate** — prompted to enter 1RM when program activates
- **Completion-based progression** — athletes advance when they log a result
- **Coach can override** — force a specific session number on any WOD
- **Weights round to nearest 2.5 kg**
- **Part A is always strength-type scoring** (weight logged)
- **Part B uses existing score system** (For Time, AMRAP, etc.)
- **Backward compatible** — WODs without a program work exactly as before

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/hooks/useStrengthProgram.js` | Program CRUD, enrollment, session resolution, 1RM management |
| `src/components/coach/StrengthProgramManager.jsx` | Create/edit/activate/deactivate programs + session builder |
| `src/components/shared/StrengthPartDisplay.jsx` | Renders Part A for any view (today's WOD, history, summary) |
| `src/components/athlete/OneRepMaxPrompt.jsx` | Banner/modal prompting athlete to enter 1RM |

### Modified Files
| File | Changes |
|------|---------|
| `supabase-schema.sql` | Add 3 new tables, modify `wods` and `results` |
| `src/lib/database.js` | Add program/enrollment CRUD, modify WOD and result functions |
| `src/hooks/useWorkouts.js` | Load program data with WODs, pass program info |
| `src/hooks/useResults.js` | Handle `strength_score` in log/edit flows |
| `src/components/coach/CoachDashboard.jsx` | Wire `useStrengthProgram` hook, pass to children |
| `src/components/coach/CoachProgramView.jsx` | Add program manager section, attach-program toggle in WOD form |
| `src/components/coach/CoachHomeDash.jsx` | Show Part A + Part B in today's WOD |
| `src/components/coach/CoachWorkoutView.jsx` | Add Part A score input when program attached |
| `src/components/athlete/AthleteDashboard.jsx` | Wire `useStrengthProgram` hook, enrollment state |
| `src/components/athlete/AthleteHomeDash.jsx` | Show Part A + Part B, 1RM prompt |
| `src/components/athlete/AthleteWorkoutView.jsx` | Two-part logging form |
| `src/components/athlete/AthleteHistoryView.jsx` | Show both parts in history cards |
| `src/components/coach/CoachHistoryView.jsx` | Show both parts in history cards |
| `src/components/shared/PostWodSummary.jsx` | Display both parts in summary modal |
| `src/components/social/Leaderboard.jsx` | Use Part B score for ranking |

---

## Task 1: Database Schema

**Files:**
- Modify: `supabase-schema.sql`

- [ ] **Step 1: Add strength_programs table**

Add after the `results` table definition in `supabase-schema.sql`:

```sql
-- ==================== STRENGTH PROGRAM TABLES ====================

-- Strength programs (e.g., "Old School Squat Routine")
CREATE TABLE IF NOT EXISTS strength_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exercise TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_by UUID REFERENCES profiles(id),
  created_by_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Add program_sessions table**

```sql
-- Individual sessions within a program
CREATE TABLE IF NOT EXISTS program_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES strength_programs(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  percentage NUMERIC(5,1) NOT NULL,
  notes TEXT,
  UNIQUE(program_id, session_number)
);
```

- [ ] **Step 3: Add athlete_enrollments table**

```sql
-- Athlete enrollment in active program (1RM + progress)
CREATE TABLE IF NOT EXISTS athlete_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES strength_programs(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  one_rep_max NUMERIC(6,1) NOT NULL,
  current_session INTEGER NOT NULL DEFAULT 1,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, athlete_id)
);
```

- [ ] **Step 4: Add columns to existing tables**

```sql
-- Add strength program link to WODs
-- ALTER TABLE wods ADD COLUMN IF NOT EXISTS strength_program_id UUID REFERENCES strength_programs(id) ON DELETE SET NULL;
-- ALTER TABLE wods ADD COLUMN IF NOT EXISTS program_session_override INTEGER;

-- Add strength score to results (Part A score)
-- ALTER TABLE results ADD COLUMN IF NOT EXISTS strength_score TEXT;
```

Also add to the `wods` CREATE TABLE as nullable columns:

```sql
  strength_program_id UUID REFERENCES strength_programs(id) ON DELETE SET NULL,
  program_session_override INTEGER,
```

And to the `results` CREATE TABLE:

```sql
  strength_score TEXT,
```

- [ ] **Step 5: Add RLS policies for new tables**

```sql
-- Strength programs RLS
ALTER TABLE strength_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programs viewable by authenticated"
  ON strength_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches insert programs"
  ON strength_programs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches update programs"
  ON strength_programs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches delete programs"
  ON strength_programs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- Program sessions RLS
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions viewable by authenticated"
  ON program_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches insert sessions"
  ON program_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches update sessions"
  ON program_sessions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Coaches delete sessions"
  ON program_sessions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- Athlete enrollments RLS
ALTER TABLE athlete_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrollments viewable by authenticated"
  ON athlete_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own enrollment"
  ON athlete_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = athlete_id);
CREATE POLICY "Users update own enrollment"
  ON athlete_enrollments FOR UPDATE TO authenticated USING (auth.uid() = athlete_id);
```

- [ ] **Step 6: Add indexes**

```sql
CREATE INDEX IF NOT EXISTS idx_program_sessions_program ON program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_program ON athlete_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_athlete ON athlete_enrollments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wods_program ON wods(strength_program_id);
```

- [ ] **Step 7: Add updated_at triggers**

```sql
CREATE TRIGGER update_strength_programs_updated_at
  BEFORE UPDATE ON strength_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON athlete_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 8: Commit**

```bash
git add supabase-schema.sql
git commit -m "feat: add strength program schema (programs, sessions, enrollments)"
```

---

## Task 2: Database Layer — Program & Enrollment CRUD

**Files:**
- Modify: `src/lib/database.js`

- [ ] **Step 1: Add strength program CRUD functions**

Add after the `// ==================== BADGE FUNCTIONS ====================` section in `database.js`:

```javascript
// ==================== STRENGTH PROGRAM FUNCTIONS ====================

export async function getActiveProgram() {
  const { data, error } = await supabase
    .from('strength_programs')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllPrograms() {
  const { data, error } = await supabase
    .from('strength_programs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProgram(program, userId, userName) {
  const { data, error } = await supabase
    .from('strength_programs')
    .insert({
      name: program.name,
      exercise: program.exercise,
      duration_weeks: program.durationWeeks,
      sessions_per_week: program.sessionsPerWeek,
      total_sessions: program.totalSessions,
      status: program.status || 'draft',
      created_by: userId,
      created_by_name: userName,
      notes: program.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProgram(id, program) {
  const { data, error } = await supabase
    .from('strength_programs')
    .update({
      name: program.name,
      exercise: program.exercise,
      duration_weeks: program.durationWeeks,
      sessions_per_week: program.sessionsPerWeek,
      total_sessions: program.totalSessions,
      notes: program.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function activateProgram(id) {
  // Deactivate any currently active program first
  await supabase
    .from('strength_programs')
    .update({ status: 'completed' })
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('strength_programs')
    .update({ status: 'active' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateProgram(id) {
  const { data, error } = await supabase
    .from('strength_programs')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProgram(id) {
  const { error } = await supabase
    .from('strength_programs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

- [ ] **Step 2: Add program session CRUD functions**

```javascript
// ==================== PROGRAM SESSION FUNCTIONS ====================

export async function getSessionsForProgram(programId) {
  const { data, error } = await supabase
    .from('program_sessions')
    .select('*')
    .eq('program_id', programId)
    .order('session_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertProgramSessions(programId, sessions) {
  // Delete existing sessions and replace with new set
  await supabase
    .from('program_sessions')
    .delete()
    .eq('program_id', programId);

  if (sessions.length === 0) return [];

  const rows = sessions.map((s, i) => ({
    program_id: programId,
    session_number: i + 1,
    sets: s.sets,
    reps: s.reps,
    percentage: s.percentage,
    notes: s.notes || null,
  }));

  const { data, error } = await supabase
    .from('program_sessions')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}
```

- [ ] **Step 3: Add enrollment functions**

```javascript
// ==================== ENROLLMENT FUNCTIONS ====================

export async function getMyEnrollment(programId, athleteId) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .select('*')
    .eq('program_id', programId)
    .eq('athlete_id', athleteId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllEnrollments(programId) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .select('*, profiles!athlete_id(name, email)')
    .eq('program_id', programId);

  if (error) throw error;
  return data || [];
}

export async function enrollAthlete(programId, athleteId, oneRepMax) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .upsert(
      {
        program_id: programId,
        athlete_id: athleteId,
        one_rep_max: oneRepMax,
        current_session: 1,
      },
      { onConflict: 'program_id,athlete_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOneRepMax(enrollmentId, oneRepMax) {
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .update({ one_rep_max: oneRepMax })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function advanceSession(enrollmentId, currentSession, totalSessions) {
  const nextSession = Math.min(currentSession + 1, totalSessions);
  const { data, error } = await supabase
    .from('athlete_enrollments')
    .update({ current_session: nextSession })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function overrideAllEnrollments(programId, sessionNumber) {
  const { error } = await supabase
    .from('athlete_enrollments')
    .update({ current_session: sessionNumber })
    .eq('program_id', programId);

  if (error) throw error;
}
```

- [ ] **Step 4: Modify createWod and updateWod to include program fields**

In `createWod`, add to the insert object:

```javascript
strength_program_id: wod.strengthProgramId || null,
program_session_override: wod.programSessionOverride || null,
```

In `updateWod`, add to the updates object:

```javascript
strength_program_id: wod.strengthProgramId || null,
program_session_override: wod.programSessionOverride || null,
```

- [ ] **Step 5: Modify wodToAppFormat to include program fields**

```javascript
export function wodToAppFormat(wod) {
  if (!wod) return null;
  return {
    id: wod.id,
    name: wod.name,
    date: wod.date,
    type: wod.type,
    group: wod.group_type,
    movements: wod.movements,
    notes: wod.notes,
    photoData: wod.photo_url,
    postedById: wod.posted_by,
    postedBy: wod.posted_by_name,
    postedAt: wod.created_at,
    strengthProgramId: wod.strength_program_id,
    programSessionOverride: wod.program_session_override,
  };
}
```

- [ ] **Step 6: Modify createResult and updateResult for strength_score**

In `createResult`, add to the insert object:

```javascript
strength_score: result.strengthScore || null,
```

In `updateResult`, add to the update object:

```javascript
strength_score: result.strengthScore || null,
```

- [ ] **Step 7: Modify resultToAppFormat to include strength_score**

```javascript
export function resultToAppFormat(result) {
  if (!result) return null;
  return {
    id: result.id,
    wodId: result.wod_id,
    date: result.date,
    athleteName: result.athlete_name,
    athleteEmail: result.athlete_email,
    athleteId: result.athlete_id,
    time: result.time,
    movements: result.movements,
    notes: result.notes,
    photoData: result.photo_url,
    customWodName: result.custom_wod_name,
    customWodType: result.custom_wod_type,
    rx: result.rx ?? 'rx',
    strengthScore: result.strength_score,
    loggedAt: result.created_at,
  };
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/database.js
git commit -m "feat: add database functions for strength programs, sessions, and enrollments"
```

---

## Task 3: useStrengthProgram Hook

**Files:**
- Create: `src/hooks/useStrengthProgram.js`

- [ ] **Step 1: Create the hook**

```javascript
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

  const loadSessionsForProgram = useCallback(async (programId) => {
    try {
      const sessions = await db.getSessionsForProgram(programId);
      setProgramSessions(sessions);
      return sessions;
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }, []);

  const createProgram = useCallback(async (programData, sessions) => {
    if (!currentUser) return null;
    try {
      const program = await db.createProgram(
        programData,
        currentUser.id,
        currentUser.name
      );
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
        myEnrollment.id,
        myEnrollment.current_session,
        activeProgram.total_sessions
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
      // Reload own enrollment if exists
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
      const session = programSessions.find(
        s => s.session_number === wod.programSessionOverride
      );
      return session || null;
    }

    // Otherwise use athlete's current session from enrollment
    if (!myEnrollment) return null;
    const session = programSessions.find(
      s => s.session_number === myEnrollment.current_session
    );
    return session || null;
  }, [activeProgram, programSessions, myEnrollment]);

  const getMyWorkingWeight = useCallback((session) => {
    if (!session || !myEnrollment) return null;
    return calculateWorkingWeight(
      parseFloat(myEnrollment.one_rep_max),
      parseFloat(session.percentage)
    );
  }, [myEnrollment]);

  return {
    // State
    activeProgram,
    allPrograms,
    programSessions,
    myEnrollment,
    allEnrollments,

    // Program management (coach)
    loadAllPrograms,
    loadActiveProgram,
    loadSessionsForProgram,
    createProgram,
    updateProgram,
    activateProgram,
    deactivateProgram,
    deleteProgramById,

    // Enrollment (athlete)
    loadMyEnrollment,
    loadAllEnrollments,
    enroll,
    updateMyOneRepMax,
    advanceMySession,

    // Coach override
    overrideAllToSession,

    // Session resolution
    getMySession,
    getMyWorkingWeight,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useStrengthProgram.js
git commit -m "feat: add useStrengthProgram hook for program management and enrollment"
```

---

## Task 4: StrengthPartDisplay Component

**Files:**
- Create: `src/components/shared/StrengthPartDisplay.jsx`

This reusable component renders Part A anywhere — today's WOD, history cards, summary modal.

- [ ] **Step 1: Create the component**

```javascript
import React from 'react';
import { Dumbbell } from 'lucide-react';
import { roundToNearest, calculateWorkingWeight } from '../../hooks/useStrengthProgram';

export default function StrengthPartDisplay({
  program,        // { name, exercise }
  session,        // { session_number, sets, reps, percentage, notes }
  enrollment,     // { one_rep_max } — null if not enrolled
  strengthScore,  // logged weight (string) — null if not logged yet
  compact = false,
}) {
  if (!program || !session) return null;

  const workingWeight = enrollment
    ? calculateWorkingWeight(parseFloat(enrollment.one_rep_max), parseFloat(session.percentage))
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-bold">A</span>
        <span className="text-slate-300">{program.exercise}</span>
        <span className="text-white font-medium">
          {session.sets}×{session.reps} @ {session.percentage}%
        </span>
        {workingWeight && (
          <span className="text-emerald-400 font-medium">({workingWeight} kg)</span>
        )}
        {strengthScore && (
          <span className="text-green-400 ml-auto">{strengthScore} kg ✓</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-bold">Part A</span>
        <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider">
          {program.name}
        </span>
        <span className="text-slate-500 text-xs ml-auto">
          Session {session.session_number}/{program.total_sessions || '?'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <Dumbbell className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-white font-medium text-lg">{program.exercise}</p>
          <p className="text-emerald-300 text-sm">
            {session.sets} sets × {session.reps} reps @ {session.percentage}% of 1RM
          </p>
        </div>
      </div>

      {enrollment && (
        <div className="bg-emerald-900/40 rounded px-3 py-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Your 1RM: {enrollment.one_rep_max} kg</span>
            <span className="text-emerald-300 font-bold">
              Working weight: {workingWeight} kg
            </span>
          </div>
        </div>
      )}

      {!enrollment && (
        <p className="text-amber-400 text-sm mt-2">
          Enter your 1RM to see your working weight
        </p>
      )}

      {strengthScore && (
        <div className="flex items-center gap-2 mt-2 text-green-400 text-sm font-medium">
          <span>✓ Logged: {strengthScore} kg</span>
        </div>
      )}

      {session.notes && (
        <p className="text-slate-400 text-sm italic mt-2">{session.notes}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/StrengthPartDisplay.jsx
git commit -m "feat: add StrengthPartDisplay component for Part A rendering"
```

---

## Task 5: OneRepMaxPrompt Component

**Files:**
- Create: `src/components/athlete/OneRepMaxPrompt.jsx`

Banner shown to athletes when a program is active but they haven't enrolled.

- [ ] **Step 1: Create the component**

```javascript
import React, { useState } from 'react';
import { Dumbbell, X } from 'lucide-react';

export default function OneRepMaxPrompt({
  program,     // { name, exercise }
  enrollment,  // null if not enrolled, object if enrolled
  onEnroll,    // (oneRepMax: number) => Promise
  onUpdate,    // (oneRepMax: number) => Promise
}) {
  const [oneRepMax, setOneRepMax] = useState(
    enrollment ? String(enrollment.one_rep_max) : ''
  );
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  if (!program) return null;

  // Already enrolled and not editing — show compact display with edit option
  if (enrollment && !editing) {
    return (
      <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-slate-300">
            {program.exercise} 1RM:
          </span>
          <span className="text-emerald-400 font-bold">{enrollment.one_rep_max} kg</span>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Update
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    const value = parseFloat(oneRepMax);
    if (isNaN(value) || value <= 0) {
      setError('Enter a valid weight in kg');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (enrollment) {
        await onUpdate(value);
      } else {
        await onEnroll(value);
      }
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Error saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-white font-medium">{program.name}</p>
            <p className="text-sm text-slate-400">
              {enrollment ? 'Update your' : 'Enter your'} {program.exercise} 1RM to get started
            </p>
          </div>
        </div>
        {editing && (
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <div className="flex-1 relative">
          <input
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g., 120"
            value={oneRepMax}
            onChange={(e) => setOneRepMax(e.target.value)}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">kg</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '...' : enrollment ? 'Update' : 'Save'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/athlete/OneRepMaxPrompt.jsx
git commit -m "feat: add OneRepMaxPrompt component for 1RM enrollment"
```

---

## Task 6: Coach Program Manager UI

**Files:**
- Create: `src/components/coach/StrengthProgramManager.jsx`
- Modify: `src/components/coach/CoachProgramView.jsx`
- Modify: `src/components/coach/CoachDashboard.jsx`

- [ ] **Step 1: Create StrengthProgramManager component**

This component handles creating, editing, activating, and deactivating programs. It includes a session builder where the coach defines each session's sets/reps/percentage.

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Square, ChevronDown, ChevronUp, Dumbbell, Edit2, Users } from 'lucide-react';

export default function StrengthProgramManager({
  allPrograms,
  activeProgram,
  programSessions,
  allEnrollments,
  loadAllPrograms,
  loadSessionsForProgram,
  loadAllEnrollments,
  createProgram,
  updateProgram,
  activateProgram,
  deactivateProgram,
  deleteProgramById,
  overrideAllToSession,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [expandedProgram, setExpandedProgram] = useState(null);
  const [overrideSession, setOverrideSession] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    exercise: '',
    durationWeeks: 6,
    sessionsPerWeek: 3,
    notes: '',
  });
  const [sessions, setSessions] = useState([]);

  const totalSessions = formData.durationWeeks * formData.sessionsPerWeek;

  // Initialize session rows when total changes
  useEffect(() => {
    if (showForm && sessions.length !== totalSessions) {
      const newSessions = Array.from({ length: totalSessions }, (_, i) => {
        const existing = sessions[i];
        return existing || { sets: 5, reps: 5, percentage: 80, notes: '' };
      });
      setSessions(newSessions.slice(0, totalSessions));
    }
  }, [totalSessions, showForm]);

  const resetForm = () => {
    setFormData({ name: '', exercise: '', durationWeeks: 6, sessionsPerWeek: 3, notes: '' });
    setSessions([]);
    setEditingProgram(null);
    setShowForm(false);
  };

  const handleEdit = async (program) => {
    const sessionsData = await loadSessionsForProgram(program.id);
    setFormData({
      name: program.name,
      exercise: program.exercise,
      durationWeeks: program.duration_weeks,
      sessionsPerWeek: program.sessions_per_week,
      notes: program.notes || '',
    });
    setSessions(sessionsData.map(s => ({
      sets: s.sets,
      reps: s.reps,
      percentage: parseFloat(s.percentage),
      notes: s.notes || '',
    })));
    setEditingProgram(program);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.exercise) {
      alert('Please enter a program name and exercise');
      return;
    }
    if (sessions.length === 0) {
      alert('Please configure at least one session');
      return;
    }

    const programData = {
      ...formData,
      totalSessions: sessions.length,
    };

    try {
      if (editingProgram) {
        await updateProgram(editingProgram.id, programData, sessions);
        alert('Program updated!');
      } else {
        await createProgram(programData, sessions);
        alert('Program created!');
      }
      resetForm();
    } catch (error) {
      alert('Error saving program: ' + error.message);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateProgram(id);
      alert('Program activated! All athletes will be prompted to enter their 1RM.');
    } catch (error) {
      alert('Error activating program: ' + error.message);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await deactivateProgram(id);
      alert('Program deactivated.');
    } catch (error) {
      alert('Error deactivating program: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProgramById(id);
      alert('Program deleted.');
    } catch (error) {
      alert('Error deleting program: ' + error.message);
    }
  };

  const handleOverride = async () => {
    const num = parseInt(overrideSession, 10);
    if (isNaN(num) || num < 1 || num > activeProgram.total_sessions) {
      alert(`Enter a session number between 1 and ${activeProgram.total_sessions}`);
      return;
    }
    try {
      await overrideAllToSession(num);
      setOverrideSession('');
      alert(`All athletes moved to session ${num}.`);
    } catch (error) {
      alert('Error overriding: ' + error.message);
    }
  };

  const updateSession = (index, field, value) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: value };
    setSessions(updated);
  };

  const weekNumber = (sessionIndex) => Math.floor(sessionIndex / formData.sessionsPerWeek) + 1;

  const toggleExpanded = async (program) => {
    if (expandedProgram === program.id) {
      setExpandedProgram(null);
    } else {
      setExpandedProgram(program.id);
      await loadSessionsForProgram(program.id);
      if (program.status === 'active') {
        await loadAllEnrollments(program.id);
      }
    }
  };

  // ==================== FORM VIEW ====================
  if (showForm) {
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-white font-bold text-lg mb-4">
          {editingProgram ? 'Edit Program' : 'New Strength Program'}
        </h3>

        {/* Program Details */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Program Name</label>
            <input
              type="text"
              placeholder="e.g., Old School Squat Routine"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Exercise</label>
            <input
              type="text"
              placeholder="e.g., Back Squat"
              value={formData.exercise}
              onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Weeks</label>
              <input
                type="number"
                min="1"
                max="52"
                value={formData.durationWeeks}
                onChange={(e) => setFormData({ ...formData, durationWeeks: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Sessions/Week</label>
              <input
                type="number"
                min="1"
                max="7"
                value={formData.sessionsPerWeek}
                onChange={(e) => setFormData({ ...formData, sessionsPerWeek: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Notes (optional)</label>
            <textarea
              placeholder="Program notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Session Builder */}
        <div className="mb-4">
          <h4 className="text-white font-medium mb-2">
            Sessions ({totalSessions} total)
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session, i) => {
              const week = weekNumber(i);
              const showWeekHeader = i === 0 || weekNumber(i - 1) !== week;
              return (
                <React.Fragment key={i}>
                  {showWeekHeader && (
                    <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider pt-2">
                      Week {week}
                    </div>
                  )}
                  <div className="bg-slate-700 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-6 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-500 text-xs">Sets</label>
                        <input
                          type="number"
                          min="1"
                          value={session.sets}
                          onChange={(e) => updateSession(i, 'sets', parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-slate-600 text-white px-2 py-1 rounded border border-slate-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 text-xs">Reps</label>
                        <input
                          type="number"
                          min="1"
                          value={session.reps}
                          onChange={(e) => updateSession(i, 'reps', parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-slate-600 text-white px-2 py-1 rounded border border-slate-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 text-xs">% 1RM</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          step="0.5"
                          value={session.percentage}
                          onChange={(e) => updateSession(i, 'percentage', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-600 text-white px-2 py-1 rounded border border-slate-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium"
          >
            {editingProgram ? 'Update Program' : 'Create Program'}
          </button>
          <button
            onClick={resetForm}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-bold text-lg">Strength Programs</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> New Program
        </button>
      </div>

      {/* Active Program Override (Coach) */}
      {activeProgram && expandedProgram === activeProgram.id && (
        <div className="bg-slate-700 rounded-lg p-3">
          <p className="text-slate-300 text-sm mb-2">Override: set all athletes to a specific session</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max={activeProgram.total_sessions}
              placeholder={`1-${activeProgram.total_sessions}`}
              value={overrideSession}
              onChange={(e) => setOverrideSession(e.target.value)}
              className="w-24 bg-slate-600 text-white px-3 py-1.5 rounded border border-slate-500 text-sm"
            />
            <button
              onClick={handleOverride}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded text-sm"
            >
              Override All
            </button>
          </div>
          {allEnrollments.length > 0 && (
            <div className="mt-2">
              <p className="text-slate-400 text-xs mb-1">
                <Users className="w-3 h-3 inline mr-1" />
                {allEnrollments.length} enrolled
              </p>
            </div>
          )}
        </div>
      )}

      {/* Program List */}
      {allPrograms.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No strength programs yet</p>
          <p className="text-sm mt-1">Create one to get started</p>
        </div>
      )}

      {allPrograms.map((program) => (
        <div
          key={program.id}
          className={`bg-slate-800 rounded-xl border ${
            program.status === 'active'
              ? 'border-emerald-600/50'
              : 'border-slate-700'
          }`}
        >
          {/* Program Header */}
          <div
            className="p-4 cursor-pointer"
            onClick={() => toggleExpanded(program)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{program.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    program.status === 'active'
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : program.status === 'draft'
                        ? 'bg-slate-600/50 text-slate-400'
                        : 'bg-slate-600/30 text-slate-500'
                  }`}>
                    {program.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  {program.exercise} · {program.duration_weeks}wk · {program.sessions_per_week}x/wk · {program.total_sessions} sessions
                </p>
              </div>
              {expandedProgram === program.id ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {expandedProgram === program.id && (
            <div className="px-4 pb-4 border-t border-slate-700 pt-3">
              {/* Sessions Preview */}
              {programSessions.length > 0 && programSessions[0]?.program_id === program.id && (
                <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                  {programSessions.map((s) => (
                    <div key={s.id} className="flex items-center text-sm bg-slate-700/50 rounded px-3 py-1.5">
                      <span className="text-slate-500 w-8">#{s.session_number}</span>
                      <span className="text-white">
                        {s.sets}×{s.reps} @ {s.percentage}%
                      </span>
                      {s.notes && <span className="text-slate-400 ml-2 italic">{s.notes}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {program.status === 'draft' && (
                  <button
                    onClick={() => handleActivate(program.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Activate
                  </button>
                )}
                {program.status === 'active' && (
                  <button
                    onClick={() => handleDeactivate(program.id)}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
                  >
                    <Square className="w-3 h-3" /> Deactivate
                  </button>
                )}
                {program.status !== 'active' && (
                  <>
                    <button
                      onClick={() => handleEdit(program)}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire useStrengthProgram into CoachDashboard**

In `src/components/coach/CoachDashboard.jsx`, add the import and hook:

```javascript
import { useStrengthProgram } from '../../hooks/useStrengthProgram';
```

Inside the component, after the existing hooks:

```javascript
const strengthProgram = useStrengthProgram(currentUser);
```

In the data loading `useEffect`, after `loadAllWODs()`, add:

```javascript
await strengthProgram.loadActiveProgram();
await strengthProgram.loadAllPrograms();
if (strengthProgram.activeProgram) {
  await strengthProgram.loadMyEnrollment(strengthProgram.activeProgram.id);
}
```

Pass `strengthProgram` to `CoachProgramView`:

```javascript
<CoachProgramView
  {...existingProps}
  strengthProgram={strengthProgram}
/>
```

Also pass to `CoachHomeDash` and `CoachWorkoutView`:

```javascript
<CoachHomeDash
  {...existingProps}
  activeProgram={strengthProgram.activeProgram}
  programSessions={strengthProgram.programSessions}
  myEnrollment={strengthProgram.myEnrollment}
  getMySession={strengthProgram.getMySession}
  getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
/>
```

- [ ] **Step 3: Add StrengthProgramManager to CoachProgramView**

In `src/components/coach/CoachProgramView.jsx`, import and render above the WOD form:

```javascript
import StrengthProgramManager from './StrengthProgramManager';
```

At the top of the list view (before the WOD list), add:

```javascript
<StrengthProgramManager
  allPrograms={strengthProgram.allPrograms}
  activeProgram={strengthProgram.activeProgram}
  programSessions={strengthProgram.programSessions}
  allEnrollments={strengthProgram.allEnrollments}
  loadAllPrograms={strengthProgram.loadAllPrograms}
  loadSessionsForProgram={strengthProgram.loadSessionsForProgram}
  loadAllEnrollments={strengthProgram.loadAllEnrollments}
  createProgram={strengthProgram.createProgram}
  updateProgram={strengthProgram.updateProgram}
  activateProgram={strengthProgram.activateProgram}
  deactivateProgram={strengthProgram.deactivateProgram}
  deleteProgramById={strengthProgram.deleteProgramById}
  overrideAllToSession={strengthProgram.overrideAllToSession}
/>

<div className="border-t border-slate-700 my-4" />
```

- [ ] **Step 4: Add "Attach Program" toggle in WOD form**

In the WOD form section of `CoachProgramView.jsx`, after the Group dropdown and before the Movements section, add:

```javascript
{strengthProgram.activeProgram && (
  <div className="col-span-2">
    <label className="flex items-center gap-3 cursor-pointer bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3">
      <input
        type="checkbox"
        checked={!!newWOD.strengthProgramId}
        onChange={(e) => setNewWOD({
          ...newWOD,
          strengthProgramId: e.target.checked ? strengthProgram.activeProgram.id : null,
          programSessionOverride: null,
        })}
        className="w-4 h-4 accent-emerald-500"
      />
      <div>
        <span className="text-white text-sm font-medium">
          Attach: {strengthProgram.activeProgram.name}
        </span>
        <span className="text-emerald-400 text-xs block">
          {strengthProgram.activeProgram.exercise} as Part A
        </span>
      </div>
    </label>

    {newWOD.strengthProgramId && (
      <div className="mt-2 flex items-center gap-2">
        <label className="text-slate-400 text-xs">Session override (optional):</label>
        <input
          type="number"
          min="1"
          max={strengthProgram.activeProgram.total_sessions}
          placeholder="Auto"
          value={newWOD.programSessionOverride || ''}
          onChange={(e) => setNewWOD({
            ...newWOD,
            programSessionOverride: e.target.value ? parseInt(e.target.value, 10) : null,
          })}
          className="w-20 bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 text-xs"
        />
      </div>
    )}
  </div>
)}
```

Also add `strengthProgramId` and `programSessionOverride` to the `newWOD` reset objects (3 locations in CoachProgramView where `setNewWOD` resets to defaults — search for `type: 'For Time'`):

```javascript
strengthProgramId: null,
programSessionOverride: null,
```

And in `useWorkouts.js`, add these to the default `newWOD` state and all reset locations:

```javascript
strengthProgramId: null,
programSessionOverride: null,
```

- [ ] **Step 5: Commit**

```bash
git add src/components/coach/StrengthProgramManager.jsx \
        src/components/coach/CoachDashboard.jsx \
        src/components/coach/CoachProgramView.jsx \
        src/hooks/useWorkouts.js
git commit -m "feat: add coach strength program manager with session builder and WOD attach toggle"
```

---

## Task 7: Athlete Enrollment + Dashboard Integration

**Files:**
- Modify: `src/components/athlete/AthleteDashboard.jsx`
- Modify: `src/components/athlete/AthleteHomeDash.jsx`

- [ ] **Step 1: Wire useStrengthProgram into AthleteDashboard**

In `src/components/athlete/AthleteDashboard.jsx`, add import:

```javascript
import { useStrengthProgram } from '../../hooks/useStrengthProgram';
```

Add hook after existing hooks:

```javascript
const strengthProgram = useStrengthProgram(currentUser);
```

In the data loading `useEffect`, add after `loadAllWODs()`:

```javascript
const program = await strengthProgram.loadActiveProgram();
if (program) {
  await strengthProgram.loadMyEnrollment(program.id);
}
```

Pass to `AthleteHomeDash`:

```javascript
<AthleteHomeDash
  {...existingProps}
  activeProgram={strengthProgram.activeProgram}
  programSessions={strengthProgram.programSessions}
  myEnrollment={strengthProgram.myEnrollment}
  getMySession={strengthProgram.getMySession}
  getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
  onEnroll={(orm) => strengthProgram.enroll(strengthProgram.activeProgram.id, orm)}
  onUpdateOneRepMax={strengthProgram.updateMyOneRepMax}
/>
```

Pass to `AthleteWorkoutView`:

```javascript
<AthleteWorkoutView
  {...existingProps}
  activeProgram={strengthProgram.activeProgram}
  programSessions={strengthProgram.programSessions}
  myEnrollment={strengthProgram.myEnrollment}
  getMySession={strengthProgram.getMySession}
  getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
  advanceMySession={strengthProgram.advanceMySession}
/>
```

- [ ] **Step 2: Add 1RM prompt and Part A display to AthleteHomeDash**

In `src/components/athlete/AthleteHomeDash.jsx`, add imports:

```javascript
import OneRepMaxPrompt from './OneRepMaxPrompt';
import StrengthPartDisplay from '../shared/StrengthPartDisplay';
```

After the stats section and before the today's WOD section, add the 1RM prompt:

```javascript
{activeProgram && (
  <OneRepMaxPrompt
    program={activeProgram}
    enrollment={myEnrollment}
    onEnroll={onEnroll}
    onUpdate={onUpdateOneRepMax}
  />
)}
```

In the today's WOD display (Case 2: WOD posted), before the movements list, add Part A display when the WOD has a program attached:

```javascript
{todayWOD?.strengthProgramId && activeProgram && (
  <div className="mb-3">
    <StrengthPartDisplay
      program={activeProgram}
      session={getMySession(todayWOD)}
      enrollment={myEnrollment}
      strengthScore={myResult?.existingResultId ? null : null}
    />
    <div className="border-t border-slate-700 my-3" />
    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">Part B</span>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/athlete/AthleteDashboard.jsx \
        src/components/athlete/AthleteHomeDash.jsx
git commit -m "feat: add athlete enrollment prompt and Part A display on dashboard"
```

---

## Task 8: Two-Part Workout Logging

**Files:**
- Modify: `src/components/athlete/AthleteWorkoutView.jsx`
- Modify: `src/hooks/useResults.js`
- Modify: `src/components/coach/CoachWorkoutView.jsx`

- [ ] **Step 1: Add Part A score input to AthleteWorkoutView**

In `src/components/athlete/AthleteWorkoutView.jsx`, add import:

```javascript
import StrengthPartDisplay from '../shared/StrengthPartDisplay';
```

At the top of the coach WOD logging mode (Mode A), before the movement weight inputs, check if the WOD has a program attached. If so, render Part A section:

```javascript
{/* Part A: Strength Program */}
{currentWod?.strengthProgramId && activeProgram && (() => {
  const session = getMySession(currentWod);
  const workingWeight = session ? getMyWorkingWeight(session) : null;
  return session ? (
    <div className="mb-4">
      <StrengthPartDisplay
        program={activeProgram}
        session={session}
        enrollment={myEnrollment}
      />
      <div className="mt-3">
        <label className="block text-slate-300 mb-1 text-sm">
          Weight used (kg)
        </label>
        <input
          type="number"
          step="0.5"
          placeholder={workingWeight ? `Target: ${workingWeight} kg` : 'Weight in kg'}
          value={myResult.strengthScore || ''}
          onChange={(e) => setMyResult(prev => ({ ...prev, strengthScore: e.target.value }))}
          className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
        />
      </div>
      <div className="border-t border-slate-700 my-4" />
      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold mb-3 inline-block">Part B</span>
    </div>
  ) : null;
})()}
```

Where `currentWod` is either `editingWorkout` (with WOD data looked up) or `todayWOD`.

- [ ] **Step 2: Add strengthScore to myResult state in useResults**

In `src/hooks/useResults.js`, add `strengthScore` to the initial `myResult` state:

```javascript
const [myResult, setMyResult] = useState({
  time: '',
  movements: [],
  notes: '',
  photoData: null,
  rx: 'rx',
  strengthScore: '',
});
```

Also add it to all reset points where `setMyResult` is called with a new object (search for `setMyResult({` — approximately 6 locations). Add `strengthScore: ''` to each.

When loading today's result (in `loadMyResults`), populate from existing:

```javascript
strengthScore: todayResult.strengthScore || '',
```

- [ ] **Step 3: Pass strengthScore through logResult**

In the `logResult` function in `useResults.js`, add to `resultData`:

```javascript
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
```

- [ ] **Step 4: Advance session after logging**

In `AthleteWorkoutView.jsx` (or in the `logResult` callback in `AthleteDashboard.jsx`), after a successful log for a WOD with a program attached, call `advanceMySession`:

In the `logResult` callback wrapper in `AthleteDashboard.jsx`:

```javascript
logResult={() => results.logResult(todayWOD, allWODs, async (freshResults) => {
  await loadMissedWODs(freshResults);
  const prs = calculateBenchmarkPRs(freshResults, allWODs);
  setBenchmarkPRs(prs);
  await badges.checkAndAwardBadges(freshResults, allWODs, prs);
  // Advance strength program session if WOD had program attached
  if (todayWOD?.strengthProgramId && strengthProgram.myEnrollment) {
    await strengthProgram.advanceMySession();
  }
})}
```

- [ ] **Step 5: Add same Part A handling to CoachWorkoutView**

Apply the same pattern to `src/components/coach/CoachWorkoutView.jsx` — coaches also log their own workouts and need to see/log Part A.

- [ ] **Step 6: Commit**

```bash
git add src/components/athlete/AthleteWorkoutView.jsx \
        src/components/athlete/AthleteDashboard.jsx \
        src/components/coach/CoachWorkoutView.jsx \
        src/hooks/useResults.js
git commit -m "feat: add two-part workout logging with strength score and session advancement"
```

---

## Task 9: History Views — Show Both Parts

**Files:**
- Modify: `src/components/athlete/AthleteHistoryView.jsx`
- Modify: `src/components/coach/CoachHistoryView.jsx`
- Modify: `src/components/shared/PostWodSummary.jsx`

- [ ] **Step 1: Add Part A display to AthleteHistoryView**

In `src/components/athlete/AthleteHistoryView.jsx`, add import:

```javascript
import StrengthPartDisplay from '../shared/StrengthPartDisplay';
```

Accept new props: `activeProgram`, `programSessions`, `myEnrollment`.

In each history card, when the result has a `strengthScore` and the matching WOD has `strengthProgramId`, show a compact Part A line above the movements:

```javascript
{result.strengthScore && wod?.strengthProgramId && activeProgram && (() => {
  const session = programSessions?.find(s => {
    // For history, we don't know which session it was — show the score
    return true;
  });
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">A</span>
        <span className="text-slate-300">{activeProgram.exercise}</span>
        <span className="text-emerald-400 font-medium">{result.strengthScore} kg</span>
      </div>
      <div className="border-t border-slate-700/50 my-2" />
      <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">B</span>
    </div>
  );
})()}
```

- [ ] **Step 2: Apply same pattern to CoachHistoryView**

Same changes in `src/components/coach/CoachHistoryView.jsx`.

- [ ] **Step 3: Update PostWodSummary to show both parts**

In `src/components/shared/PostWodSummary.jsx`, accept new props: `activeProgram`, `programSession`, `enrollment`.

Before the movements section, if the result has a strength score:

```javascript
{result?.strengthScore && activeProgram && (
  <div className="mb-4">
    <StrengthPartDisplay
      program={activeProgram}
      session={programSession}
      enrollment={enrollment}
      strengthScore={result.strengthScore}
    />
    <div className="border-t border-slate-700 my-3" />
    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold mb-2 inline-block">Part B</span>
  </div>
)}
```

- [ ] **Step 4: Update Leaderboard to use Part B score**

The leaderboard already uses `result.time` which is the Part B score — no changes needed. The `strengthScore` is stored separately and doesn't affect leaderboard ranking.

Verify this by checking `src/hooks/useLeaderboard.js` — it sorts by `compareScores(a.time, b.time, wodType)` which only uses the `time` field. Correct — no change needed.

- [ ] **Step 5: Commit**

```bash
git add src/components/athlete/AthleteHistoryView.jsx \
        src/components/coach/CoachHistoryView.jsx \
        src/components/shared/PostWodSummary.jsx
git commit -m "feat: display Part A strength scores in history views and workout summary"
```

---

## Task 10: Pass Program Props Through All Dashboards

**Files:**
- Modify: `src/components/coach/CoachDashboard.jsx`
- Modify: `src/components/athlete/AthleteDashboard.jsx`

This task ensures all child components receive the program-related props they need. The earlier tasks defined what props each component accepts — this task wires the actual prop passing in the dashboard orchestrators.

- [ ] **Step 1: Complete CoachDashboard prop wiring**

Verify every tab component that needs program data receives it:

```javascript
// CoachHomeDash
activeProgram={strengthProgram.activeProgram}
programSessions={strengthProgram.programSessions}
myEnrollment={strengthProgram.myEnrollment}
getMySession={strengthProgram.getMySession}
getMyWorkingWeight={strengthProgram.getMyWorkingWeight}

// CoachWorkoutView
activeProgram={strengthProgram.activeProgram}
programSessions={strengthProgram.programSessions}
myEnrollment={strengthProgram.myEnrollment}
getMySession={strengthProgram.getMySession}
getMyWorkingWeight={strengthProgram.getMyWorkingWeight}

// CoachHistoryView
activeProgram={strengthProgram.activeProgram}
programSessions={strengthProgram.programSessions}
myEnrollment={strengthProgram.myEnrollment}

// CoachProgramView
strengthProgram={strengthProgram}
```

- [ ] **Step 2: Complete AthleteDashboard prop wiring**

```javascript
// AthleteHomeDash
activeProgram={strengthProgram.activeProgram}
programSessions={strengthProgram.programSessions}
myEnrollment={strengthProgram.myEnrollment}
getMySession={strengthProgram.getMySession}
getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
onEnroll={(orm) => strengthProgram.enroll(strengthProgram.activeProgram.id, orm)}
onUpdateOneRepMax={strengthProgram.updateMyOneRepMax}

// AthleteWorkoutView
activeProgram={strengthProgram.activeProgram}
programSessions={strengthProgram.programSessions}
myEnrollment={strengthProgram.myEnrollment}
getMySession={strengthProgram.getMySession}
getMyWorkingWeight={strengthProgram.getMyWorkingWeight}
advanceMySession={strengthProgram.advanceMySession}

// AthleteHistoryView
activeProgram={strengthProgram.activeProgram}
programSessions={strengthProgram.programSessions}
myEnrollment={strengthProgram.myEnrollment}
```

- [ ] **Step 3: Reload program data after logging**

In both dashboards, after logging a result for a WOD with a program, reload enrollment to get updated `current_session`:

```javascript
if (todayWOD?.strengthProgramId) {
  await strengthProgram.loadMyEnrollment(strengthProgram.activeProgram?.id);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/coach/CoachDashboard.jsx \
        src/components/athlete/AthleteDashboard.jsx
git commit -m "feat: wire strength program props through all dashboard components"
```

---

## Task 11: Schema File Consolidation + CLAUDE.md Update

**Files:**
- Modify: `supabase-schema.sql` (apply all changes from Task 1)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Apply all schema changes to supabase-schema.sql**

Add the full SQL from Task 1 steps 1-7 to the schema file in the appropriate sections.

- [ ] **Step 2: Update CLAUDE.md**

Add to the Database Schema section:

```
-- Strength program tables
strength_programs (id, name, exercise, duration_weeks, sessions_per_week, total_sessions, status, created_by, created_by_name, notes, created_at, updated_at)
program_sessions (id, program_id, session_number, sets, reps, percentage, notes)
athlete_enrollments (id, program_id, athlete_id, one_rep_max, current_session, enrolled_at, updated_at)
```

Add to Features section:

```
### Strength Programs
- Coach defines multi-week programs (e.g., Old School Squat Routine)
- Sessions specify sets × reps × percentage of 1RM
- One active program at a time, whole box participates
- Athletes enter 1RM, app calculates working weights (rounded to 2.5 kg)
- Completion-based progression through sessions
- Coach can override all athletes to a specific session
- Programs attach as Part A of daily WODs
- Part B is the regular WOD (For Time, AMRAP, etc.)
```

Add to File Locations:

```
src/hooks/useStrengthProgram.js     # Program CRUD, enrollment, session resolution
src/components/coach/StrengthProgramManager.jsx  # Program creation/management UI
src/components/shared/StrengthPartDisplay.jsx    # Part A display component
src/components/athlete/OneRepMaxPrompt.jsx       # 1RM enrollment prompt
```

Add to Testing:

```
16. **Strength Program (Coach):** Create program → Add sessions → Activate → Verify athletes prompted
17. **1RM Enrollment:** Enter 1RM → Verify working weight calculation → Update 1RM → Verify recalculation
18. **Two-Part WOD:** Post WOD with program → Log Part A + Part B → Verify both scores in history
19. **Session Progression:** Log result → Verify session advances → Log again → Verify next session
20. **Coach Override:** Override all to session 5 → Verify all athletes see session 5
```

- [ ] **Step 3: Commit**

```bash
git add supabase-schema.sql CLAUDE.md
git commit -m "docs: update schema and CLAUDE.md with strength program feature"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Database schema | — | `supabase-schema.sql` |
| 2 | Database layer functions | — | `database.js` |
| 3 | useStrengthProgram hook | `useStrengthProgram.js` | — |
| 4 | StrengthPartDisplay component | `StrengthPartDisplay.jsx` | — |
| 5 | OneRepMaxPrompt component | `OneRepMaxPrompt.jsx` | — |
| 6 | Coach program manager + WOD integration | `StrengthProgramManager.jsx` | `CoachDashboard.jsx`, `CoachProgramView.jsx`, `useWorkouts.js` |
| 7 | Athlete enrollment + dashboard | — | `AthleteDashboard.jsx`, `AthleteHomeDash.jsx` |
| 8 | Two-part workout logging | — | `AthleteWorkoutView.jsx`, `CoachWorkoutView.jsx`, `useResults.js`, `AthleteDashboard.jsx` |
| 9 | History views + summary | — | `AthleteHistoryView.jsx`, `CoachHistoryView.jsx`, `PostWodSummary.jsx` |
| 10 | Prop wiring consolidation | — | `CoachDashboard.jsx`, `AthleteDashboard.jsx` |
| 11 | Schema + docs | — | `supabase-schema.sql`, `CLAUDE.md` |

**Estimated scope:** 4 new files, ~14 modified files, ~1,200 lines of new code.
