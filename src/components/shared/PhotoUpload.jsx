import React from 'react';
import { Image, Trash2 } from 'lucide-react';

/**
 * Photo upload widget with camera capture and file picker buttons,
 * plus an image preview with a remove button.
 *
 * Props:
 *   photoData     (string|null) - Base64 data URL of the current photo, or null
 *   onPhotoUpload (function)    - onChange handler for the file input (receives the event)
 *   onPhotoRemove (function)    - Called when the user clicks the remove button
 *   onPhotoClick  (function)    - Called when the user clicks the preview image (e.g. to open modal)
 */
export default function PhotoUpload({ photoData, onPhotoUpload, onPhotoRemove, onPhotoClick }) {
  return (
    <div>
      <label className="block text-slate-300 mb-2">Add Photo</label>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
          <Image className="w-5 h-5" />
          Take Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoUpload}
            className="hidden"
          />
        </label>
        <label className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center gap-2">
          <Image className="w-5 h-5" />
          Choose Photo
          <input
            type="file"
            accept="image/*"
            onChange={onPhotoUpload}
            className="hidden"
          />
        </label>
      </div>
      {photoData && (
        <div className="relative">
          <img
            src={photoData}
            alt="Preview"
            className="w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={onPhotoClick}
          />
          <button
            onClick={onPhotoRemove}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
