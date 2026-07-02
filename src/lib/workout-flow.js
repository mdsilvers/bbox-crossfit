export function toEditableWod(wod) {
  return {
    name: wod.name || '',
    date: wod.date,
    type: wod.type,
    group: wod.group,
    // Deep-copy movements: form edits would otherwise mutate the WOD
    // object still rendered in the list (visible even after Cancel)
    movements: wod.movements.map(m => ({ ...m })),
    notes: wod.notes,
    // Without these, saving an edit strips the attached strength program
    // (updateWod coerces missing fields to null)
    strengthProgramId: wod.strengthProgramId || null,
    programSessionOverride: wod.programSessionOverride || null,
  };
}

// Advance the strength session only on the FIRST log of today's program
// WOD — editing a result (or logging a missed WOD) must not advance it.
export function shouldAdvanceStrengthSession({
  activeProgram,
  enrollment,
  todayWOD,
  wodId,
  isEdit,
}) {
  return Boolean(
    !isEdit &&
    activeProgram &&
    enrollment &&
    todayWOD?.strengthProgramId &&
    activeProgram.id === todayWOD.strengthProgramId &&
    wodId === todayWOD.id
  );
}

// Results that block a coach from deleting a WOD: any other user's result
// linked to it. Legacy rows have no wodId — a date-matched, non-custom row
// counts as linked.
export function getBlockingWodResults(results, currentUser, wod) {
  return (results || []).filter(r =>
    r.athleteEmail !== currentUser.email &&
    (r.wodId ? r.wodId === wod.id : !(r.customWodName || r.customWodType))
  );
}
