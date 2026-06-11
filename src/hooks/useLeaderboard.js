import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/database';
import { compareScores } from '../lib/score-utils';

export function useLeaderboard(date, wodType, wodId) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all');
  const channelRef = useRef(null);

  // Memoized so the realtime callback and refreshLeaderboard always close
  // over the current date/wodId instead of a stale render's values
  const fetchLeaderboard = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const data = await db.getLeaderboardForDate(date, wodId);
      setResults(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [date, wodId]);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime updates on results for this date
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (date) {
      // Channel name includes wodId — two leaderboards on the same date
      // (e.g. mens + womens WODs) would otherwise share a channel and the
      // first unmount would kill the other's subscription
      const channel = supabase
        .channel(`leaderboard-${date}-${wodId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'results',
            filter: `date=eq.${date}`,
          },
          () => {
            fetchLeaderboard();
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [date, wodId, fetchLeaderboard]);

  // Filter by gender, then split into ranked (has score) and unranked (no score)
  const genderFiltered = results.filter(r => {
    if (genderFilter === 'all') return true;
    return r.groupType === genderFilter;
  });
  const ranked = genderFiltered
    .filter(r => r.time)
    .sort((a, b) => compareScores(a.time, b.time, wodType));
  const unranked = genderFiltered.filter(r => !r.time);
  const filteredResults = [...ranked, ...unranked];
  const rankedCount = ranked.length;

  return {
    leaderboardResults: filteredResults,
    rankedCount,
    totalParticipants: results.length,
    loading,
    genderFilter,
    setGenderFilter,
    refreshLeaderboard: fetchLeaderboard,
  };
}
