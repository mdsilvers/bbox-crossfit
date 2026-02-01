import React, { useState, useEffect } from 'react';
import { Dumbbell, Award, Trophy } from 'lucide-react';
import * as db from '../../lib/database';
import { formatScore } from '../../lib/score-utils';
import { BADGES } from '../../lib/badges';

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

export default function ActivityFeed({ currentUser, allWODs }) {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const items = [];

      // Get recent results (all athletes)
      const allResults = await db.getAllResults();
      const recentResults = allResults.slice(0, 50).map(r => db.resultToAppFormat(r));

      recentResults.forEach(result => {
        const wod = allWODs?.find(w => w.id === result.wodId);
        const wodName = result.customWodName || wod?.name || 'Daily WOD';
        const wodType = result.customWodType || wod?.type || 'Other';

        items.push({
          type: 'workout',
          timestamp: result.loggedAt,
          text: `${result.athleteName} logged ${wodName}`,
          score: result.time ? formatScore(result.time, wodType) : null,
          isCurrentUser: result.athleteId === currentUser?.id,
        });
      });

      // Get recent badges
      try {
        const recentBadges = await db.getAllRecentBadges(20);
        recentBadges.forEach(b => {
          const badge = BADGES.find(bd => bd.key === b.badge_key);
          items.push({
            type: 'badge',
            timestamp: b.earned_at,
            text: `${b.profiles?.name || 'Someone'} earned ${badge?.name || b.badge_key}`,
            isCurrentUser: b.user_id === currentUser?.id,
          });
        });
      } catch {
        // Badges table might not exist yet
      }

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setFeedItems(items);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = feedItems.filter(item => {
    if (filter === 'mine') return item.isCurrentUser;
    if (filter === 'badges') return item.type === 'badge';
    return true;
  });

  const ICON_MAP = {
    workout: Dumbbell,
    badge: Award,
    reaction: Trophy,
  };

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
            const Icon = ICON_MAP[item.type] || Dumbbell;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 bg-slate-800 rounded-xl p-3 border ${
                  item.isCurrentUser ? 'border-red-600/20' : 'border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  item.type === 'badge' ? 'bg-yellow-600/20' :
                  item.type === 'reaction' ? 'bg-red-600/20' :
                  'bg-slate-700'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    item.type === 'badge' ? 'text-yellow-400' :
                    item.type === 'reaction' ? 'text-red-400' :
                    'text-slate-300'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm">{item.text}</p>
                  {item.score && (
                    <span className="text-white font-semibold text-sm"> {item.score}</span>
                  )}
                  <p className="text-slate-500 text-xs mt-0.5">{timeAgo(item.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
