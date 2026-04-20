import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import * as db from '../../lib/database';

/**
 * Thumbnail/indicator for a photo that may not be loaded yet.
 *
 * - If `photoData` is already a data URL, renders it as a thumbnail directly.
 * - If only `hasPhoto` is true, renders a lightweight placeholder button.
 *   On click, fetches the full photo from the DB, caches it in local state,
 *   and opens the PhotoModal via `onOpen(url)`.
 *
 * Props:
 *   table      'results' | 'wods'
 *   id         row id for lazy fetch
 *   hasPhoto   boolean
 *   photoData  optional prefetched data URL (single-row queries)
 *   onOpen     (url) => void — called with the resolved photo URL
 *   className  wrapper classes (default: thumbnail-sized)
 *   imgClassName classes applied to the rendered <img>
 */
export default function LazyPhoto({
  table,
  id,
  hasPhoto,
  photoData,
  onOpen,
  className = 'w-full h-32',
  imgClassName = 'w-full h-full object-cover hover:opacity-90 transition-opacity',
}) {
  const [cached, setCached] = useState(photoData || null);
  const [loading, setLoading] = useState(false);

  const effective = cached || photoData;
  if (!effective && !hasPhoto) return null;

  const fetchAndOpen = async (e) => {
    if (e) e.stopPropagation();
    if (effective) {
      onOpen?.(effective);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const url = table === 'wods' ? await db.getWodPhoto(id) : await db.getResultPhoto(id);
      if (url) {
        setCached(url);
        onOpen?.(url);
      }
    } catch (err) {
      console.error('Error loading photo:', err);
    } finally {
      setLoading(false);
    }
  };

  if (effective) {
    if (!onOpen) {
      return (
        <div className={`${className} rounded-lg overflow-hidden`}>
          <img src={effective} alt="Workout" className={imgClassName} />
        </div>
      );
    }
    return (
      <button type="button" onClick={fetchAndOpen} className={`${className} block rounded-lg overflow-hidden`}>
        <img src={effective} alt="Workout" className={imgClassName} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={fetchAndOpen}
      disabled={loading}
      className={`${className} flex items-center justify-center gap-2 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 text-sm transition-colors`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ) : (
        <>
          <ImageIcon className="w-4 h-4" />
          <span>View photo</span>
        </>
      )}
    </button>
  );
}
