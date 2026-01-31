import React, { useState, useEffect } from 'react';
import {
  getScoreCategory,
  parseStoredScore,
  formatScoreForStorage,
  getScoreLabel,
} from '../lib/score-utils';

/**
 * Context-aware score input component.
 * Renders different inputs based on WOD type.
 *
 * Props:
 *  - wodType: string (e.g. "For Time", "AMRAP", "Strength")
 *  - value: string (the stored score text, e.g. "12:34", "8+15", "225")
 *  - onChange: (newValue: string) => void
 */
export default function ScoreInput({ wodType, value, onChange }) {
  const category = getScoreCategory(wodType);

  // For structured categories, try to parse the stored value.
  // If parsing fails, fall back to freeform.
  const [fallbackToFreeform, setFallbackToFreeform] = useState(false);

  // Internal field states
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [freeformText, setFreeformText] = useState('');

  // Sync external value into internal fields when value or category changes
  useEffect(() => {
    if (!value) {
      setMinutes('');
      setSeconds('');
      setRounds('');
      setReps('');
      setWeight('');
      setFreeformText('');
      setFallbackToFreeform(false);
      return;
    }

    if (category === 'freeform') {
      setFreeformText(value);
      setFallbackToFreeform(false);
      return;
    }

    const parsed = parseStoredScore(value, wodType);
    if (!parsed) {
      // Can't parse for this category — show freeform with existing value
      setFreeformText(value);
      setFallbackToFreeform(true);
      return;
    }

    setFallbackToFreeform(false);
    switch (category) {
      case 'time':
        setMinutes(parsed.minutes || '');
        setSeconds(parsed.seconds || '');
        break;
      case 'amrap':
        setRounds(parsed.rounds || '');
        setReps(parsed.reps || '');
        break;
      case 'weight':
        setWeight(parsed.weight || '');
        break;
      case 'rounds':
        setRounds(parsed.rounds || '');
        break;
    }
  }, [value, category, wodType]);

  // Emit changes to parent
  const emitTime = (m, s) => {
    onChange(formatScoreForStorage({ minutes: m, seconds: s }, wodType));
  };

  const emitAmrap = (r, rp) => {
    onChange(formatScoreForStorage({ rounds: r, reps: rp }, wodType));
  };

  const emitWeight = (w) => {
    onChange(formatScoreForStorage({ weight: w }, wodType));
  };

  const emitRounds = (r) => {
    onChange(formatScoreForStorage({ rounds: r }, wodType));
  };

  const emitFreeform = (text) => {
    onChange(text);
  };

  const inputClass =
    'bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-red-500 focus:outline-none';

  // If we couldn't parse the stored value for a structured category, show freeform
  if (fallbackToFreeform) {
    return (
      <div>
        <label className="block text-slate-300 mb-2">{getScoreLabel(wodType)}</label>
        <input
          type="text"
          placeholder="Score"
          value={freeformText}
          onChange={(e) => {
            setFreeformText(e.target.value);
            emitFreeform(e.target.value);
          }}
          className={`w-full ${inputClass}`}
        />
      </div>
    );
  }

  switch (category) {
    case 'time':
      return (
        <div>
          <label className="block text-slate-300 mb-2">Completion Time</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="MM"
              value={minutes}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setMinutes(val);
                emitTime(val, seconds);
              }}
              className={`w-20 text-center ${inputClass}`}
            />
            <span className="text-slate-300 text-xl font-bold">:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="SS"
              value={seconds}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                // Cap at 59
                if (val !== '' && parseInt(val, 10) > 59) return;
                setSeconds(val);
                emitTime(minutes, val);
              }}
              className={`w-20 text-center ${inputClass}`}
            />
          </div>
        </div>
      );

    case 'amrap':
      return (
        <div>
          <label className="block text-slate-300 mb-2">Rounds + Reps</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Rounds"
              value={rounds}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setRounds(val);
                emitAmrap(val, reps);
              }}
              className={`w-24 text-center ${inputClass}`}
            />
            <span className="text-slate-300 text-lg font-bold">+</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Reps"
              value={reps}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setReps(val);
                emitAmrap(rounds, val);
              }}
              className={`w-24 text-center ${inputClass}`}
            />
          </div>
        </div>
      );

    case 'weight':
      return (
        <div>
          <label className="block text-slate-300 mb-2">Weight (kgs)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Weight"
              value={weight}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setWeight(val);
                emitWeight(val);
              }}
              className={`w-32 ${inputClass}`}
            />
            <span className="text-slate-400 text-sm">kgs</span>
          </div>
        </div>
      );

    case 'rounds':
      return (
        <div>
          <label className="block text-slate-300 mb-2">Rounds Completed</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Rounds"
            value={rounds}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setRounds(val);
              emitRounds(val);
            }}
            className={`w-32 ${inputClass}`}
          />
        </div>
      );

    default: // freeform
      return (
        <div>
          <label className="block text-slate-300 mb-2">Score</label>
          <input
            type="text"
            placeholder="e.g., 12:34 or 8 rounds + 15 reps"
            value={freeformText}
            onChange={(e) => {
              setFreeformText(e.target.value);
              emitFreeform(e.target.value);
            }}
            className={`w-full ${inputClass}`}
          />
        </div>
      );
  }
}
