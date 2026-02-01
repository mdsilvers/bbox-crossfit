import React from 'react';

const REACTION_TYPES = [
  { key: 'fist_bump', emoji: '\u{1F44A}', label: 'Fist Bump' },
  { key: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { key: 'strong', emoji: '\u{1F4AA}', label: 'Strong' },
  { key: 'trophy', emoji: '\u{1F3C6}', label: 'Trophy' },
];

export default function ReactionBar({ resultId, reactions = [], currentUserId, onToggleReaction }) {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {REACTION_TYPES.map(type => {
        const typeReactions = reactions.filter(r => r.reaction_type === type.key);
        const count = typeReactions.length;
        const isActive = typeReactions.some(r => r.user_id === currentUserId);

        return (
          <button
            key={type.key}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(resultId, type.key);
            }}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
              isActive
                ? 'bg-red-600/20 border border-red-600/40 text-white'
                : 'bg-slate-700/50 border border-slate-600/30 text-slate-400 hover:text-white hover:border-slate-500'
            }`}
            title={type.label}
          >
            <span className="text-sm">{type.emoji}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
