import React from 'react';

const MODES = [
  { key: 'rx', label: 'RX', activeClass: 'bg-green-600 text-white' },
  { key: 'train', label: 'Train', activeClass: 'bg-blue-600 text-white' },
  { key: 'sweat', label: 'Sweat', activeClass: 'bg-amber-600 text-white' },
];

// Normalize legacy boolean values to string keys
function normalize(value) {
  if (value === true || value === 'rx') return 'rx';
  if (value === false || value === 'scaled') return 'train';
  if (MODES.some(m => m.key === value)) return value;
  return 'rx';
}

export default function RxToggle({ value = 'rx', onChange }) {
  const current = normalize(value);
  return (
    <div className="mb-4">
      <label className="block text-slate-300 mb-2">Workout Mode</label>
      <div className="inline-flex rounded-lg overflow-hidden border border-slate-600">
        {MODES.map(mode => (
          <button
            key={mode.key}
            type="button"
            onClick={() => onChange(mode.key)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
              current === mode.key
                ? mode.activeClass
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
