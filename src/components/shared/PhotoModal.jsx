import React from 'react';

/**
 * Full-screen photo modal overlay.
 * Clicking the backdrop or close button dismisses the modal.
 *
 * Props:
 *   url (string)       - The image URL to display
 *   onClose (function) - Called when the modal should be dismissed
 */
export default function PhotoModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={url}
        alt="Workout photo"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
