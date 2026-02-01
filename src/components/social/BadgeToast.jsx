import React, { useEffect } from 'react';
import { Zap, Award, Shield, Target, TrendingUp, Flag, Timer } from 'lucide-react';

const ICON_MAP = {
  Zap, Award, Shield, Target, TrendingUp, Flag, Timer,
  Sword: Zap,
};

export default function BadgeToast({ badge, onDismiss }) {
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  if (!badge) return null;

  const Icon = ICON_MAP[badge.icon] || Award;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-top">
      <div className={`${badge.bgColor} border border-slate-600 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3`}>
        <Icon className={`w-8 h-8 ${badge.color}`} />
        <div>
          <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Badge Earned!</div>
          <div className="text-white font-bold">{badge.name}</div>
        </div>
        <button onClick={onDismiss} className="text-slate-400 hover:text-white ml-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
