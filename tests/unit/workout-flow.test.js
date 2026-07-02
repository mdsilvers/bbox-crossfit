import { describe, expect, it } from 'vitest';
import {
  getBlockingWodResults,
  shouldAdvanceStrengthSession,
  toEditableWod,
} from '../../src/lib/workout-flow';

describe('toEditableWod', () => {
  it('preserves strength program fields when hydrating an existing WOD for editing', () => {
    const editable = toEditableWod({
      name: 'Squat + Fran',
      date: '2026-05-18',
      type: 'For Time',
      group: 'combined',
      movements: [{ name: 'Thruster', reps: '21-15-9' }],
      notes: 'Go fast',
      strengthProgramId: 'program-123',
      programSessionOverride: 4,
    });

    expect(editable).toEqual({
      name: 'Squat + Fran',
      date: '2026-05-18',
      type: 'For Time',
      group: 'combined',
      movements: [{ name: 'Thruster', reps: '21-15-9' }],
      notes: 'Go fast',
      strengthProgramId: 'program-123',
      programSessionOverride: 4,
    });
  });

  it('deep-copies movements so form edits cannot mutate the source WOD', () => {
    const wod = {
      name: 'Fran',
      date: '2026-05-18',
      type: 'For Time',
      group: 'combined',
      movements: [{ name: 'Thruster', reps: '21-15-9' }],
      notes: '',
    };

    const editable = toEditableWod(wod);
    editable.movements[0].name = 'Deadlift';

    expect(wod.movements[0].name).toBe('Thruster');
  });

  it('defaults optional strength fields when editing a legacy WOD', () => {
    const editable = toEditableWod({
      name: null,
      date: '2026-05-18',
      type: 'AMRAP',
      group: 'mens',
      movements: [],
      notes: null,
    });

    expect(editable.strengthProgramId).toBeNull();
    expect(editable.programSessionOverride).toBeNull();
  });
});

describe('shouldAdvanceStrengthSession', () => {
  const activeProgram = { id: 'program-123' };
  const enrollment = { id: 'enrollment-123' };
  const todayWOD = { id: 'wod-123', strengthProgramId: 'program-123' };

  it('advances on the first log of today\'s program WOD', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram,
      enrollment,
      todayWOD,
      wodId: 'wod-123',
      isEdit: false,
    })).toBe(true);
  });

  it('does not advance when re-saving an existing result for the same WOD', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram,
      enrollment,
      todayWOD,
      wodId: 'wod-123',
      isEdit: true,
    })).toBe(false);
  });

  it('does not advance when logging a missed WOD from a previous day', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram,
      enrollment,
      todayWOD,
      wodId: 'wod-from-monday',
      isEdit: false,
    })).toBe(false);
  });

  it('does not advance when today\'s WOD has no strength program attached', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram,
      enrollment,
      todayWOD: { id: 'wod-123', strengthProgramId: null },
      wodId: 'wod-123',
      isEdit: false,
    })).toBe(false);
  });

  it('does not advance when today\'s WOD references a non-active program', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram,
      enrollment,
      todayWOD: { id: 'wod-123', strengthProgramId: 'old-program' },
      wodId: 'wod-123',
      isEdit: false,
    })).toBe(false);
  });

  it('does not advance without an enrollment', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram,
      enrollment: null,
      todayWOD,
      wodId: 'wod-123',
      isEdit: false,
    })).toBe(false);
  });

  it('does not advance without an active program', () => {
    expect(shouldAdvanceStrengthSession({
      activeProgram: null,
      enrollment,
      todayWOD,
      wodId: 'wod-123',
      isEdit: false,
    })).toBe(false);
  });
});

describe('getBlockingWodResults', () => {
  const coach = { email: 'coach@bbox.test' };
  const wod = { id: 'wod-123', date: '2026-05-18' };

  it('blocks deletion for other users\' results linked by wodId', () => {
    expect(getBlockingWodResults([
      { id: 'coach-result', athleteEmail: 'coach@bbox.test', wodId: 'wod-123' },
      { id: 'athlete-result', athleteEmail: 'athlete@bbox.test', wodId: 'wod-123' },
    ], coach, wod)).toEqual([
      { id: 'athlete-result', athleteEmail: 'athlete@bbox.test', wodId: 'wod-123' },
    ]);
  });

  it('ignores results linked to a different WOD', () => {
    expect(getBlockingWodResults([
      { id: 'other-wod', athleteEmail: 'athlete@bbox.test', wodId: 'wod-999' },
    ], coach, wod)).toEqual([]);
  });

  it('counts legacy date-matched results without a wodId as blocking', () => {
    expect(getBlockingWodResults([
      { id: 'legacy', athleteEmail: 'athlete@bbox.test', wodId: null },
    ], coach, wod)).toEqual([
      { id: 'legacy', athleteEmail: 'athlete@bbox.test', wodId: null },
    ]);
  });

  it('ignores custom workouts logged on the same date', () => {
    expect(getBlockingWodResults([
      { id: 'custom', athleteEmail: 'athlete@bbox.test', wodId: null, customWodName: 'Travel WOD' },
    ], coach, wod)).toEqual([]);
  });
});
