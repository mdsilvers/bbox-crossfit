import React, { useState } from 'react';

const REACTION_TYPES = [
  { key: 'fist_bump', emoji: '\u{1F44A}', label: 'Fist Bump' },
  { key: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { key: 'strong', emoji: '\u{1F4AA}', label: 'Strong' },
  { key: 'trophy', emoji: '\u{1F3C6}', label: 'Trophy' },
];

export default function ReactionBar({ resultId, reactions = [], currentUserId, onToggleReaction, isOwnResult = false }) {
  const [showPicker, setShowPicker] = useState(false);

  const reactionsWithCounts = REACTION_TYPES.map(type => {
    const typeReactions = reactions.filter(r => r.reaction_type === type.key);
    return {
      ...type,
      count: typeReactions.length,
      isActive: typeReactions.some(r => r.user_id === currentUserId),
    };
  });

  const hasAnyReactions = reactionsWithCounts.some(r => r.count > 0);

  // Own result: show received reactions read-only, or nothing
  if (isOwnResult) {
    if (!hasAnyReactions) return null;
    return (
      <div className="flex items-center gap-1.5 mt-2">
        {reactionsWithCounts
          .filter(r => r.count > 0)
          .map(r => (
            <div
              key={r.key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-700/50 border border-slate-600/30 text-slate-300"
              title={`${r.count} ${r.label}${r.count !== 1 ? 's' : ''}`}
            >
              <span className="text-sm">{r.emoji}</span>
              <span className="font-medium">{r.count}</span>
            </div>
          ))}
      </div>
    );
  }

  // Other's result: interactive
  const visibleReactions = reactionsWithCounts.filter(r => r.count > 0 || r.isActive);
  const hiddenReactions = reactionsWithCounts.filter(r => r.count === 0 && !r.isActive);

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {/* Reactions with counts or active state - always visible */}
      {visibleReactions.map(r => (
        <button
          key={r.key}
          onClick={(e) => {
            e.stopPropagation();
            onToggleReaction(resultId, r.key);
          }}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
            r.isActive
              ? 'bg-red-600/20 border border-red-600/40 text-white'
              : 'bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white hover:border-slate-500'
          }`}
          title={r.label}
        >
          <span className="text-sm">{r.emoji}</span>
          {r.count > 0 && <span className="font-medium">{r.count}</span>}
        </button>
      ))}

      {/* Expanded picker - hidden reactions */}
      {showPicker && hiddenReactions.map(r => (
        <button
          key={r.key}
          onClick={(e) => {
            e.stopPropagation();
            onToggleReaction(resultId, r.key);
            setShowPicker(false);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white hover:border-slate-500 transition-colors animate-fade-in"
          title={r.label}
        >
          <span className="text-sm">{r.emoji}</span>
        </button>
      ))}

      {/* Add reaction / primary fist bump button */}
      {!showPicker && hiddenReactions.length > 0 && (
        visibleReactions.length === 0 ? (
          // No reactions yet - show fist bump as primary action
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(resultId, 'fist_bump');
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPicker(true);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            title="Fist Bump (hold for more)"
          >
            <span className="text-sm">{'\u{1F44A}'}</span>
            <span className="text-slate-500">+</span>
          </button>
        ) : (
          // Some reactions visible - show "+" to expand picker
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(true);
            }}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            title="More reactions"
          >
            <span>+</span>
          </button>
        )
      )}
    </div>
  );
}
