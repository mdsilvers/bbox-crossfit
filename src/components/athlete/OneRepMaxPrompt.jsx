import React, { useState } from 'react';
import { Dumbbell, X } from 'lucide-react';

export default function OneRepMaxPrompt({
  program,     // { name, exercise }
  enrollment,  // null if not enrolled, object if enrolled (has one_rep_max)
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
