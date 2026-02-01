import React, { useState, useRef, useEffect } from 'react';
import { Zap, Award, Shield, Target, TrendingUp, Flag, Timer, ChevronDown } from 'lucide-react';
import { BADGES } from '../../lib/badges';

const ICON_MAP = {
  Zap, Award, Shield, Target, TrendingUp, Flag, Timer,
  Sword: Zap,
};

export default function BadgeIcons({ earnedBadgeKeys = [], size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  if (earnedBadgeKeys.length === 0) return null;

  const earned = new Set(earnedBadgeKeys);
  const earnedBadges = BADGES.filter(b => earned.has(b.key));

  const iconSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const containerSize = size === 'xs' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1"
      >
        {earnedBadges.map(badge => {
          const Icon = ICON_MAP[badge.icon] || Award;
          return (
            <div
              key={badge.key}
              className={`${containerSize} rounded-full ${badge.bgColor} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`${iconSize} ${badge.color}`} />
            </div>
          );
        })}
        <ChevronDown
          className="w-3 h-3 text-slate-500"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-50 py-2 animate-fade-in" style={{ width: '13rem' }}>
          {earnedBadges.map(badge => {
            const Icon = ICON_MAP[badge.icon] || Award;
            return (
              <div key={badge.key} className="flex items-center gap-2 px-3 py-2">
                <div className={`w-7 h-7 rounded-full ${badge.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${badge.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-white text-xs font-semibold leading-tight">{badge.name}</div>
                  <div className="text-slate-400 leading-tight" style={{ fontSize: '11px' }}>{badge.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
