import React, { useState } from 'react';
import { Zap, Award, Shield, Target, TrendingUp, Flag, Timer, Lock } from 'lucide-react';
import { BADGES } from '../../lib/badges';

// Map badge icon strings to lucide components
const ICON_MAP = {
  Zap, Award, Shield, Target, TrendingUp, Flag, Timer,
  Sword: Zap, // Fallback since lucide doesn't have Sword
};

export default function BadgeDisplay({ earnedBadgeKeys = [] }) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const earned = new Set(earnedBadgeKeys);

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-slate-700/50 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-white">Badges</h3>
        <span className="text-slate-400 text-xs">
          {earnedBadgeKeys.length}/{BADGES.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {BADGES.map(badge => {
          const isEarned = earned.has(badge.key);
          const Icon = ICON_MAP[badge.icon] || Award;

          return (
            <button
              key={badge.key}
              onClick={() => setSelectedBadge(selectedBadge?.key === badge.key ? null : badge)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                isEarned
                  ? `${badge.bgColor} border border-transparent`
                  : 'bg-slate-700/30 border border-slate-700 opacity-40'
              }`}
            >
              {isEarned ? (
                <Icon className={`w-6 h-6 ${badge.color}`} />
              ) : (
                <Lock className="w-6 h-6 text-slate-500" />
              )}
              <span className={`text-xs font-medium text-center leading-tight ${
                isEarned ? 'text-white' : 'text-slate-500'
              }`}>
                {badge.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Badge Detail */}
      {selectedBadge && (
        <div className={`mt-3 p-3 rounded-lg ${selectedBadge.bgColor} border border-slate-700`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm ${selectedBadge.color}`}>
              {selectedBadge.name}
            </span>
            {earned.has(selectedBadge.key) ? (
              <span className="text-green-400 text-xs">Earned</span>
            ) : (
              <span className="text-slate-400 text-xs">Locked</span>
            )}
          </div>
          <p className="text-slate-300 text-xs">{selectedBadge.description}</p>
        </div>
      )}
    </div>
  );
}
