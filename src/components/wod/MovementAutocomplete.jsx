import React from 'react';
import { STANDARD_MOVEMENTS } from '../../lib/constants';

/**
 * Movement name autocomplete input with dropdown suggestions.
 *
 * Props:
 *   value        (string)   - Current input value
 *   onChange      (function) - Called with the new value when the user types (receives value string)
 *   onSelect      (function) - Called with the movement name when the user picks from the dropdown
 *   movements     (array)   - Array of filtered movement name strings to show in the dropdown
 *   showDropdown  (boolean) - Whether the dropdown is currently visible
 *   onFocus       (function) - Called when the input gains focus
 *   onCustomAdd   (function) - Optional. Called when the user clicks "Add as custom". If omitted,
 *                              the custom-add option is not rendered.
 *   placeholder   (string)  - Optional. Input placeholder text (default: "Type to search movements...")
 */
export default function MovementAutocomplete({
  value,
  onChange,
  onSelect,
  movements,
  showDropdown,
  onFocus,
  onCustomAdd,
  placeholder = 'Type to search movements...',
}) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-red-500 focus:outline-none text-sm"
      />
      {showDropdown && movements.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-slate-600 border border-slate-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {movements.slice(0, 10).map((mov, idx) => (
            <div
              key={idx}
              onClick={() => onSelect(mov)}
              className="px-3 py-2 hover:bg-red-600 cursor-pointer text-white transition-colors text-sm"
            >
              {mov}
            </div>
          ))}
          {onCustomAdd && !STANDARD_MOVEMENTS.includes(value) && value?.trim() && (
            <div
              onClick={onCustomAdd}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 cursor-pointer text-white border-t border-slate-500 font-semibold transition-colors text-sm"
            >
              + Add "{value}" as custom
            </div>
          )}
        </div>
      )}
    </div>
  );
}
