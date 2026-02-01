import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dumbbell, Award } from 'lucide-react';
import * as db from '../../lib/database';
import { formatScore } from '../../lib/score-utils';
import { BADGES } from '../../lib/badges';

const REACTION_TYPES = [
  { key: 'fist_bump', emoji: '\u{1F44A}', label: 'Fist Bump' },
  { key: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { key: 'strong', emoji: '\u{1F4AA}', label: 'Strong' },
  { key: 'trophy', emoji: '\u{1F3C6}', label: 'Trophy' },
];

const REACTION_EMOJI = {};
REACTION_TYPES.forEach(r => { REACTION_EMOJI[r.key] = r.emoji; });

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Long-press hook: returns handlers for tap vs long-press
function useLongPress(onTap, onLongPress, { delay = 500 } = {}) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const movedRef = useRef(false);

  const start = useCallback((e) => {
    // Prevent text selection on long press
    firedRef.current = false;
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress?.(e);
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback(() => {
    // Cancel on scroll/drag
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      movedRef.current = true;
    }
  }, []);

  const end = useCallback((e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!firedRef.current && !movedRef.current) {
      onTap?.(e);
    }
  }, [onTap]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
}

export default function ActivityFeed({ currentUser, allWODs, reactions = {}, onToggleReaction, loadReactionsForResults }) {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tappedId, setTappedId] = useState(null);
  const [pickerResultId, setPickerResultId] = useState(null);

  // Close picker on outside tap
  useEffect(() => {
    if (!pickerResultId) return;
    const close = () => setPickerResultId(null);
    // Delay listener to avoid closing on the same event
    const t = setTimeout(() => document.addEventListener('touchstart', close, { once: true }), 50);
    return () => { clearTimeout(t); document.removeEventListener('touchstart', close); };
  }, [pickerResultId]);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const items = [];
      const allResults = await db.getAllResults();
      const recentResults = allResults.slice(0, 50).map(r => db.resultToAppFormat(r));
      const resultIds = [];

      recentResults.forEach(result => {
        const wod = allWODs?.find(w => w.id === result.wodId);
        const wodName = result.customWodName || wod?.name || 'Daily WOD';
        const wodType = result.customWodType || wod?.type || 'Other';
        resultIds.push(result.id);

        items.push({
          type: 'workout',
          resultId: result.id,
          timestamp: result.loggedAt,
          athleteName: result.athleteName,
          wodName,
          score: result.time ? formatScore(result.time, wodType) : null,
          isCurrentUser: result.athleteId === currentUser?.id,
        });
      });

      try {
        const recentBadges = await db.getAllRecentBadges(20);
        recentBadges.forEach(b => {
          const badge = BADGES.find(bd => bd.key === b.badge_key);
          items.push({
            type: 'badge',
            timestamp: b.earned_at,
            badgeName: badge?.name || b.badge_key,
            athleteName: b.profiles?.name || 'Someone',
            isCurrentUser: b.user_id === currentUser?.id,
          });
        });
      } catch {
        // Badges table might not exist yet
      }

      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setFeedItems(items);

      if (resultIds.length > 0 && loadReactionsForResults) {
        loadReactionsForResults(resultIds);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTap = useCallback((resultId) => {
    if (!onToggleReaction) return;
    setPickerResultId(null);
    onToggleReaction(resultId, 'fist_bump');
    setTappedId(resultId);
    setTimeout(() => setTappedId(null), 400);
  }, [onToggleReaction]);

  const handleLongPress = useCallback((resultId) => {
    setPickerResultId(prev => prev === resultId ? null : resultId);
  }, []);

  const handlePickerSelect = useCallback((resultId, reactionType) => {
    if (!onToggleReaction) return;
    onToggleReaction(resultId, reactionType);
    setPickerResultId(null);
    setTappedId(resultId);
    setTimeout(() => setTappedId(null), 400);
  }, [onToggleReaction]);

  const filtered = feedItems.filter(item => {
    if (filter === 'mine') return item.isCurrentUser;
    if (filter === 'badges') return item.type === 'badge';
    return true;
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Activity Feed</h2>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'mine', label: 'Mine' },
          { key: 'badges', label: 'Badges' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-slate-400">Loading activity...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 30).map((item, idx) => {
            if (item.type === 'badge') {
              return (
                <div
                  key={`badge-${idx}`}
                  className={`flex items-center gap-3 bg-slate-800 rounded-xl p-3 border ${
                    item.isCurrentUser ? 'border-yellow-600/30' : 'border-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg flex-shrink-0 bg-yellow-600/20">
                    <Award className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm">
                      <span className="text-white font-medium">{item.athleteName}</span>
                      {' earned '}
                      <span className="text-yellow-400 font-medium">{item.badgeName}</span>
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">{timeAgo(item.timestamp)}</p>
                  </div>
                </div>
              );
            }

            return (
              <WorkoutRow
                key={`workout-${item.resultId || idx}`}
                item={item}
                reactions={reactions[item.resultId] || []}
                currentUserId={currentUser?.id}
                isTapped={tappedId === item.resultId}
                showPicker={pickerResultId === item.resultId}
                isInteractive={!item.isCurrentUser && !!onToggleReaction}
                onTap={() => handleTap(item.resultId)}
                onLongPress={() => handleLongPress(item.resultId)}
                onPickerSelect={(type) => handlePickerSelect(item.resultId, type)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkoutRow({ item, reactions, currentUserId, isTapped, showPicker, isInteractive, onTap, onLongPress, onPickerSelect }) {
  const pressHandlers = useLongPress(
    isInteractive ? onTap : null,
    isInteractive ? onLongPress : null,
  );

  const reactionCounts = {};
  reactions.forEach(r => {
    reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
  });
  const hasReactions = Object.keys(reactionCounts).length > 0;

  // Which reactions the current user has given
  const myReactions = new Set(
    reactions.filter(r => r.user_id === currentUserId).map(r => r.reaction_type)
  );

  return (
    <div className="relative" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      <div
        {...(isInteractive ? pressHandlers : {})}
        className={`flex items-center gap-3 bg-slate-800 rounded-xl p-3 border transition-all duration-200 ${
          isInteractive ? 'cursor-pointer' : ''
        } ${
          isTapped ? 'border-red-500/50 bg-red-600/5' :
          item.isCurrentUser ? 'border-red-600/20' : 'border-slate-700'
        }`}
      >
        <div className="p-2 rounded-lg flex-shrink-0 bg-slate-700">
          <Dumbbell className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm">
            <span className="text-white font-medium">{item.athleteName}</span>
            {' logged '}
            <span className="text-red-400 font-medium">{item.wodName}</span>
            {item.score && (
              <span className="text-white font-semibold"> {item.score}</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-500 text-xs">{timeAgo(item.timestamp)}</span>
            {hasReactions && (
              <div className="flex items-center gap-1.5">
                {Object.entries(reactionCounts).map(([type, count]) => (
                  <span
                    key={type}
                    className={`inline-flex items-center text-xs ${
                      myReactions.has(type) ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    <span className="text-xs">{REACTION_EMOJI[type]}</span>
                    <span className="ml-0.5">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Tap flash emoji */}
        {isTapped && (
          <span className="text-lg animate-feed-bump flex-shrink-0">{'\u{1F44A}'}</span>
        )}
      </div>

      {/* Long-press reaction picker */}
      {showPicker && (
        <div className="absolute right-3 -top-12 z-20 flex items-center gap-1 bg-slate-700 rounded-full px-2 py-1.5 shadow-lg border border-slate-600 animate-fade-in">
          {REACTION_TYPES.map(r => (
            <button
              key={r.key}
              onClick={(e) => { e.stopPropagation(); onPickerSelect(r.key); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onPickerSelect(r.key); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-125 ${
                myReactions.has(r.key) ? 'bg-red-600/30' : 'hover:bg-slate-600'
              }`}
              title={r.label}
            >
              <span className="text-xl">{r.emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
