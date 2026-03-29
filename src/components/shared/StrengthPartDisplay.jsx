import React from 'react';
import { Dumbbell } from 'lucide-react';
import { roundToNearest, calculateWorkingWeight } from '../../hooks/useStrengthProgram';

export default function StrengthPartDisplay({
  program,        // { name, exercise, total_sessions }
  session,        // { session_number, sets, reps, percentage, notes }
  enrollment,     // { one_rep_max } — null if not enrolled
  strengthScore,  // logged weight (string) — null if not logged yet
  compact = false,
}) {
  if (!program || !session) return null;

  const workingWeight = enrollment
    ? calculateWorkingWeight(parseFloat(enrollment.one_rep_max), parseFloat(session.percentage))
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-bold">A</span>
        <span className="text-slate-300">{program.exercise}</span>
        <span className="text-white font-medium">
          {session.sets}×{session.reps} @ {session.percentage}%
        </span>
        {workingWeight && (
          <span className="text-emerald-400 font-medium">({workingWeight} kg)</span>
        )}
        {strengthScore && (
          <span className="text-green-400 ml-auto">{strengthScore} kg ✓</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-bold">Part A</span>
        <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider">
          {program.name}
        </span>
        <span className="text-slate-500 text-xs ml-auto">
          Session {session.session_number}/{program.total_sessions || '?'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <Dumbbell className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-white font-medium text-lg">{program.exercise}</p>
          <p className="text-emerald-300 text-sm">
            {session.sets} sets × {session.reps} reps @ {session.percentage}% of 1RM
          </p>
        </div>
      </div>

      {enrollment && (
        <div className="bg-emerald-900/40 rounded px-3 py-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Your 1RM: {enrollment.one_rep_max} kg</span>
            <span className="text-emerald-300 font-bold">
              Working weight: {workingWeight} kg
            </span>
          </div>
        </div>
      )}

      {!enrollment && (
        <p className="text-amber-400 text-sm mt-2">
          Enter your 1RM to see your working weight
        </p>
      )}

      {strengthScore && (
        <div className="flex items-center gap-2 mt-2 text-green-400 text-sm font-medium">
          <span>✓ Logged: {strengthScore} kg</span>
        </div>
      )}

      {session.notes && (
        <p className="text-slate-400 text-sm italic mt-2">{session.notes}</p>
      )}
    </div>
  );
}
