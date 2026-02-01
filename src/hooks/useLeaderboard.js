import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/database';
import { compareScores } from '../lib/score-utils';

export function useLeaderboard(date, wodType) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all');
  const channelRef = useRef(null);

  const fetchLeaderboard = async () => {
    if (!date) return;
    setLoading(true);
    try {
      const data = await db.getLeaderboardForDate(date);
      setResults(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime updates on results for this date
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (date) {
      const channel = supabase
        .channel(`leaderboard-${date}`)
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
  }, [date]);

  // Filter and sort results
  const filteredResults = results
    .filter(r => {
      if (genderFilter === 'all') return true;
      return r.groupType === genderFilter;
    })
    // Exclude results with no score
    .filter(r => r.time)
    .sort((a, b) => compareScores(a.time, b.time, wodType));

  return {
    leaderboardResults: filteredResults,
    loading,
    genderFilter,
    setGenderFilter,
    refreshLeaderboard: fetchLeaderboard,
  };
}
