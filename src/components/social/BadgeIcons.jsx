import React from 'react';
import { Zap, Award, Shield, Target, TrendingUp, Flag, Timer } from 'lucide-react';
import { BADGES } from '../../lib/badges';

const ICON_MAP = {
  Zap, Award, Shield, Target, TrendingUp, Flag, Timer,
  Sword: Zap,
};

export default function BadgeIcons({ earnedBadgeKeys = [], size = 'sm' }) {
  if (earnedBadgeKeys.length === 0) return null;

  const earned = new Set(earnedBadgeKeys);
  const earnedBadges = BADGES.filter(b => earned.has(b.key));

  const iconSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const containerSize = size === 'xs' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="flex items-center gap-1">
      {earnedBadges.map(badge => {
        const Icon = ICON_MAP[badge.icon] || Award;
        return (
          <div
            key={badge.key}
            className={`${containerSize} rounded-full ${badge.bgColor} flex items-center justify-center flex-shrink-0`}
            title={badge.name}
          >
            <Icon className={`${iconSize} ${badge.color}`} />
          </div>
        );
      })}
    </div>
  );
}
