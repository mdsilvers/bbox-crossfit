import React from 'react';

/**
 * Inline delete confirmation dialog.
 * Renders a red confirmation banner with Delete / Cancel buttons.
 *
 * Props:
 *   message   (string)   - The confirmation prompt (e.g. "Delete this workout?")
 *   onConfirm (function) - Called when the user clicks Delete
 *   onCancel  (function) - Called when the user clicks Cancel
 */
export default function DeleteConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="bg-red-600 p-4">
      <p className="text-white font-semibold mb-3">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 bg-white text-red-600 py-2 rounded-lg font-semibold"
        >
          Delete
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
