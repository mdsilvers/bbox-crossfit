import React, { useState, useRef, useCallback } from 'react';
import { formatScore } from '../../lib/score-utils';

const MEDAL_COLORS = {
  1: 'bg-yellow-500 text-yellow-900',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-amber-700 text-amber-100',
};

const REACTION_TYPES = [
  { key: 'fist_bump', emoji: '\u{1F44A}', label: 'Fist Bump' },
  { key: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { key: 'strong', emoji: '\u{1F4AA}', label: 'Strong' },
  { key: 'trophy', emoji: '\u{1F3C6}', label: 'Trophy' },
];

export default function LeaderboardRow({ rank, result, wodType, isCurrentUser, reactions = [], currentUserId, onToggleReaction }) {
  const [showPicker, setShowPicker] = useState(false);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  const isUnranked = rank === null;
  const medalClass = !isUnranked ? MEDAL_COLORS[rank] : null;

  // Compute reaction counts by type
  const reactionCounts = {};
  const userReactions = new Set();
  reactions.forEach(r => {
    reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
    if (r.user_id === currentUserId) userReactions.add(r.reaction_type);
  });

  const hasAnyReactions = Object.keys(reactionCounts).length > 0;

  const handleToggle = useCallback((type) => {
    if (onToggleReaction) {
      onToggleReaction(result.id, type);
    }
    setShowPicker(false);
  }, [onToggleReaction, result.id]);

  const canReact = !isCurrentUser && !!onToggleReaction;

  // Long-press on the row to open reaction picker
  const handlePointerDown = useCallback(() => {
    if (!canReact) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowPicker(true);
    }, 500);
  }, [canReact]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e) => {
    if (!canReact) return;
    e.preventDefault();
    setShowPicker(prev => !prev);
  }, [canReact]);

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg relative select-none ${
        isCurrentUser ? 'bg-red-600/10 border border-red-600/30' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={handleContextMenu}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8">
        {isUnranked ? (
          <div className="text-slate-500 text-sm font-medium text-center w-7">
            —
          </div>
        ) : medalClass ? (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${medalClass}`}>
            {rank}
          </div>
        ) : (
          <div className="text-slate-400 text-sm font-medium text-center w-7">
            {rank}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className={`font-medium text-sm truncate block ${isCurrentUser ? 'text-white' : isUnranked ? 'text-slate-400' : 'text-slate-200'}`}>
          {result.athleteName}
          {isCurrentUser && <span className="text-red-400 ml-1 text-xs">(You)</span>}
        </span>
      </div>

      {/* Inline reaction counts (shown when reactions exist) */}
      {hasAnyReactions && (
        <div className="flex-shrink-0 flex items-center gap-0.5">
          {REACTION_TYPES.filter(rt => reactionCounts[rt.key]).map(rt => (
            <span
              key={rt.key}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-xs ${
                !isCurrentUser && userReactions.has(rt.key)
                  ? 'bg-red-600/20 border border-red-600/40 text-white'
                  : 'bg-slate-700/50 border border-slate-600/30 text-slate-400'
              }`}
            >
              <span className="text-[10px]">{rt.emoji}</span>
              <span className="font-medium text-[10px]">{reactionCounts[rt.key]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Workout Mode Badge */}
      {!isUnranked && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
          result.rx === 'sweat' ? 'bg-amber-600/20 text-amber-400'
          : result.rx === 'train' || result.rx === false ? 'bg-blue-600/20 text-blue-400'
          : 'bg-green-600/20 text-green-400'
        }`}>
          {result.rx === 'sweat' ? 'SW' : result.rx === 'train' || result.rx === false ? 'TR' : 'RX'}
        </span>
      )}

      {/* Score */}
      <div className="flex-shrink-0">
        {isUnranked ? (
          <span className="text-slate-500 text-xs font-medium">Completed</span>
        ) : (
          <span className="text-white font-bold text-sm">
            {formatScore(result.time, wodType)}
          </span>
        )}
      </div>

      {/* Reaction picker (shown on long-press or context menu) */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute right-3 bottom-full mb-1 z-50 flex items-center gap-1 bg-slate-800 border border-slate-600 rounded-full px-2 py-1.5 shadow-xl">
            {REACTION_TYPES.map(rt => (
              <button
                key={rt.key}
                onClick={(e) => { e.stopPropagation(); handleToggle(rt.key); }}
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-transform hover:scale-125 ${
                  userReactions.has(rt.key) ? 'bg-red-600/30' : 'hover:bg-slate-700'
                }`}
                title={rt.label}
              >
                {rt.emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
