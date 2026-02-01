import React from 'react';
import { Flame } from 'lucide-react';

export default function StreakBadge({ weeks }) {
  if (!weeks || weeks < 1) return null;

  const colorClass =
    weeks >= 12 ? 'text-red-400' :
    weeks >= 8 ? 'text-orange-400' :
    weeks >= 4 ? 'text-yellow-400' :
    'text-green-400';

  return (
    <div className="flex items-center gap-1">
      <Flame className={`w-4 h-4 ${colorClass}`} />
      <span className={`font-bold text-sm ${colorClass}`}>{weeks}</span>
      <span className="text-slate-400 text-xs">week streak</span>
    </div>
  );
}
