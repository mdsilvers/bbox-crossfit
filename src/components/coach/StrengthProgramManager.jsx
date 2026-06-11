import React, { useState } from 'react';
import { Plus, Trash2, Play, Square, ChevronDown, ChevronUp, Dumbbell, Edit2, Users } from 'lucide-react';

const emptySession = (num) => ({ session_number: num, sets: '', reps: '', percentage: '' });

function generateSessions(weeks, perWeek) {
  const total = weeks * perWeek;
  return Array.from({ length: total }, (_, i) => emptySession(i + 1));
}

function getWeekNumber(sessionNumber, sessionsPerWeek) {
  return Math.ceil(sessionNumber / sessionsPerWeek);
}

const STATUS_BADGE = {
  draft: 'bg-slate-600 text-slate-200',
  active: 'bg-emerald-600 text-white',
  completed: 'bg-amber-600 text-white',
};

export default function StrengthProgramManager({
  allPrograms,
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
  const [expandedId, setExpandedId] = useState(null);
  // Sessions keyed by program id — a single shared list showed whichever
  // program was loaded last in every expanded panel
  const [expandedSessions, setExpandedSessions] = useState({});
  const [overrideSession, setOverrideSession] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    exercise: '',
    duration_weeks: 4,
    sessions_per_week: 2,
    notes: '',
  });
  const [formSessions, setFormSessions] = useState(() => generateSessions(4, 2));

  const resetForm = () => {
    setFormData({ name: '', exercise: '', duration_weeks: 4, sessions_per_week: 2, notes: '' });
    setFormSessions(generateSessions(4, 2));
    setEditingProgram(null);
    setShowForm(false);
  };

  const handleNewProgram = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditProgram = async (program) => {
    const sessions = await loadSessionsForProgram(program.id);
    setEditingProgram(program);
    setFormData({
      name: program.name,
      exercise: program.exercise,
      duration_weeks: program.duration_weeks,
      sessions_per_week: program.sessions_per_week,
      notes: program.notes || '',
    });
    if (sessions && sessions.length > 0) {
      setFormSessions(sessions.map(s => ({
        session_number: s.session_number,
        sets: s.sets?.toString() || '',
        reps: s.reps?.toString() || '',
        percentage: s.percentage?.toString() || '',
      })));
    } else {
      setFormSessions(generateSessions(program.duration_weeks, program.sessions_per_week));
    }
    setShowForm(true);
  };

  const handleWeeksOrFreqChange = (field, value) => {
    const numVal = parseInt(value, 10) || 0;
    const updated = { ...formData, [field]: numVal };
    setFormData(updated);

    const newTotal = updated.duration_weeks * updated.sessions_per_week;
    const currentTotal = formSessions.length;

    if (newTotal > currentTotal) {
      const additional = Array.from(
        { length: newTotal - currentTotal },
        (_, i) => emptySession(currentTotal + i + 1)
      );
      setFormSessions([...formSessions, ...additional]);
    } else if (newTotal < currentTotal) {
      setFormSessions(formSessions.slice(0, newTotal));
    }
  };

  const updateSession = (index, field, value) => {
    const updated = [...formSessions];
    updated[index] = { ...updated[index], [field]: value };
    setFormSessions(updated);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a program name');
      return;
    }
    if (!formData.exercise.trim()) {
      alert('Please enter an exercise');
      return;
    }

    const totalSessions = formData.duration_weeks * formData.sessions_per_week;
    const programPayload = {
      name: formData.name.trim(),
      exercise: formData.exercise.trim(),
      durationWeeks: formData.duration_weeks,
      sessionsPerWeek: formData.sessions_per_week,
      totalSessions: totalSessions,
      notes: formData.notes.trim() || null,
    };

    const sessionsPayload = formSessions.map((s, i) => ({
      session_number: i + 1,
      sets: s.sets ? parseInt(s.sets, 10) : null,
      reps: s.reps ? parseInt(s.reps, 10) : null,
      percentage: s.percentage ? parseFloat(s.percentage) : null,
    }));

    try {
      if (editingProgram) {
        await updateProgram(editingProgram.id, programPayload, sessionsPayload);
        alert('Program updated successfully!');
      } else {
        await createProgram(programPayload, sessionsPayload);
        alert('Program created successfully!');
      }
      resetForm();
    } catch (error) {
      alert('Error saving program: ' + error.message);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateProgram(id);
      alert('Program activated!');
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
    if (!confirm('Delete this program? This cannot be undone.')) return;
    try {
      await deleteProgramById(id);
      setExpandedId(null);
      alert('Program deleted.');
    } catch (error) {
      alert('Error deleting program: ' + error.message);
    }
  };

  const handleOverride = async (totalSessions) => {
    const num = parseInt(overrideSession, 10);
    if (!num || num < 1 || (totalSessions && num > totalSessions)) {
      alert(`Enter a session number between 1 and ${totalSessions || '?'}`);
      return;
    }
    try {
      await overrideAllToSession(num);
      alert(`All athletes set to session ${num}`);
      setOverrideSession('');
    } catch (error) {
      alert('Error overriding sessions: ' + error.message);
    }
  };

  const toggleExpand = async (program) => {
    if (expandedId === program.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(program.id);
    const sessions = await loadSessionsForProgram(program.id);
    setExpandedSessions(prev => ({ ...prev, [program.id]: sessions }));
    if (program.status === 'active') {
      await loadAllEnrollments(program.id);
    }
  };

  // ==================== FORM VIEW ====================
  if (showForm) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-emerald-700/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            {editingProgram ? 'Edit Program' : 'New Strength Program'}
          </h3>
          <button onClick={resetForm} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-slate-300 text-sm font-medium mb-1">Program Name</label>
            <input
              type="text"
              placeholder="e.g., Back Squat Cycle"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-slate-300 text-sm font-medium mb-1">Exercise</label>
            <input
              type="text"
              placeholder="e.g., Back Squat"
              value={formData.exercise}
              onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">Duration (weeks)</label>
            <input
              type="number"
              min="1"
              max="52"
              value={formData.duration_weeks}
              onChange={(e) => handleWeeksOrFreqChange('duration_weeks', e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">Sessions / week</label>
            <input
              type="number"
              min="1"
              max="7"
              value={formData.sessions_per_week}
              onChange={(e) => handleWeeksOrFreqChange('sessions_per_week', e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-slate-300 text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              placeholder="Program notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none h-16 text-sm"
            />
          </div>
        </div>

        {/* Session Builder */}
        <div className="mb-4">
          <h4 className="text-slate-300 font-semibold text-sm mb-3">
            Sessions ({formSessions.length} total)
          </h4>
          <div className="space-y-2">
            {formSessions.map((session, index) => {
              const weekNum = getWeekNumber(index + 1, formData.sessions_per_week);
              const isFirstInWeek = index === 0 || getWeekNumber(index, formData.sessions_per_week) !== weekNum;

              return (
                <React.Fragment key={index}>
                  {isFirstInWeek && (
                    <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-3 mb-1">
                      Week {weekNum}
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-2">
                    <span className="text-slate-400 text-xs w-8 text-center flex-shrink-0">
                      S{index + 1}
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Sets"
                      value={session.sets}
                      onChange={(e) => updateSession(index, 'sets', e.target.value)}
                      className="w-16 bg-slate-600 text-white px-2 py-1.5 rounded border border-slate-500 focus:border-emerald-500 focus:outline-none text-xs text-center"
                    />
                    <span className="text-slate-500 text-xs">x</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Reps"
                      value={session.reps}
                      onChange={(e) => updateSession(index, 'reps', e.target.value)}
                      className="w-16 bg-slate-600 text-white px-2 py-1.5 rounded border border-slate-500 focus:border-emerald-500 focus:outline-none text-xs text-center"
                    />
                    <span className="text-slate-500 text-xs">@</span>
                    <input
                      type="number"
                      min="1"
                      max="110"
                      placeholder="%"
                      value={session.percentage}
                      onChange={(e) => updateSession(index, 'percentage', e.target.value)}
                      className="w-16 bg-slate-600 text-white px-2 py-1.5 rounded border border-slate-500 focus:border-emerald-500 focus:outline-none text-xs text-center"
                    />
                    <span className="text-slate-500 text-xs">%</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {editingProgram ? 'Update Program' : 'Create Program'}
          </button>
          <button
            onClick={resetForm}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-emerald-400" />
          Strength Programs
        </h3>
        <button
          onClick={handleNewProgram}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Program
        </button>
      </div>

      {allPrograms.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No strength programs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allPrograms.map((program) => {
            const isExpanded = expandedId === program.id;
            const isActive = program.status === 'active';
            const sessions = expandedSessions[program.id] || [];

            return (
              <div
                key={program.id}
                className={`bg-slate-800 rounded-xl border overflow-hidden ${
                  isActive ? 'border-emerald-700/50' : 'border-slate-700'
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() => toggleExpand(program)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold">{program.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${STATUS_BADGE[program.status] || STATUS_BADGE.draft}`}>
                          {program.status}
                        </span>
                      </div>
                      <div className="text-emerald-400 text-sm">{program.exercise}</div>
                      <div className="text-slate-400 text-xs mt-1">
                        {program.duration_weeks}w &middot; {program.sessions_per_week}x/week &middot; {program.total_sessions} sessions
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4">
                    {program.notes && (
                      <div className="bg-slate-700 rounded p-2 text-slate-300 text-xs mb-3">
                        {program.notes}
                      </div>
                    )}

                    {/* Sessions list */}
                    {sessions.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-slate-300 text-xs font-semibold mb-2">Sessions</h4>
                        <div className="grid grid-cols-2 gap-1">
                          {sessions.map((s) => (
                            <div key={s.session_number} className="bg-slate-700 rounded px-2 py-1 text-xs">
                              <span className="text-emerald-400 font-medium">S{s.session_number}</span>
                              <span className="text-slate-300 ml-1">
                                {s.sets}x{s.reps} @ {s.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active program: enrollment count + override */}
                    {isActive && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{allEnrollments.length} athlete{allEnrollments.length !== 1 ? 's' : ''} enrolled</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-slate-400 text-xs">Set all athletes to session:</label>
                          <input
                            type="number"
                            min="1"
                            max={program.total_sessions}
                            placeholder="#"
                            value={overrideSession}
                            onChange={(e) => setOverrideSession(e.target.value)}
                            className="w-16 bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 text-xs"
                          />
                          <button
                            onClick={() => handleOverride(program.total_sessions)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded font-medium"
                          >
                            Override
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {program.status === 'draft' && (
                        <button
                          onClick={() => handleActivate(program.id)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-medium"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Activate
                        </button>
                      )}
                      {isActive && (
                        <button
                          onClick={() => handleDeactivate(program.id)}
                          className="flex items-center gap-1 bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded-lg font-medium"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Deactivate
                        </button>
                      )}
                      {!isActive && (
                        <>
                          <button
                            onClick={() => handleEditProgram(program)}
                            className="flex items-center gap-1 bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-2 rounded-lg font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(program.id)}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded-lg font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
