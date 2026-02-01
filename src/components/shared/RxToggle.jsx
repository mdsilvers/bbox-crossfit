import React from 'react';

export default function RxToggle({ value = true, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-slate-300 mb-2">Workout Mode</label>
      <div className="inline-flex rounded-lg overflow-hidden border border-slate-600">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
            value
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          RX
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
            !value
              ? 'bg-amber-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          Scaled
        </button>
      </div>
    </div>
  );
}
