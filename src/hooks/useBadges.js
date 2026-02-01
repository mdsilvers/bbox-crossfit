import { useState, useCallback } from 'react';
import * as db from '../lib/database';
import { BADGES, calculateStreakWeeks, checkBadges } from '../lib/badges';

export function useBadges(currentUser) {
  const [myBadges, setMyBadges] = useState([]);
  const [streakWeeks, setStreakWeeks] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [newBadgeToast, setNewBadgeToast] = useState(null);

  const loadMyBadges = useCallback(async () => {
    if (!currentUser) return [];
    try {
      const data = await db.getUserBadges(currentUser.id);
      const keys = data.map(b => b.badge_key);
      setMyBadges(keys);
      return keys;
    } catch (error) {
      console.error('Error loading badges:', error);
      return [];
    }
  }, [currentUser]);

  const checkAndAwardBadges = useCallback(async (results, allWODs, benchmarkPRs) => {
    if (!currentUser || !results) return;

    try {
      // Calculate streak
      const streak = calculateStreakWeeks(results);
      setStreakWeeks(streak);

      const newBest = Math.max(streak, bestStreak);
      setBestStreak(newBest);

      // Update profile streak
      await db.updateProfileStreak(currentUser.id, streak, newBest);

      // Check for new badges
      const existingKeys = myBadges;
      const newBadgeKeys = checkBadges(results, allWODs, benchmarkPRs, streak, existingKeys);

      // Award new badges
      for (const key of newBadgeKeys) {
        await db.awardBadge(currentUser.id, key);
      }

      if (newBadgeKeys.length > 0) {
        setMyBadges(prev => [...prev, ...newBadgeKeys]);
        // Show toast for the first new badge
        const badge = BADGES.find(b => b.key === newBadgeKeys[0]);
        if (badge) {
          setNewBadgeToast(badge);
        }
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }, [currentUser, myBadges, bestStreak]);

  const dismissToast = useCallback(() => {
    setNewBadgeToast(null);
  }, []);

  return {
    myBadges,
    streakWeeks,
    bestStreak,
    newBadgeToast,
    loadMyBadges,
    checkAndAwardBadges,
    dismissToast,
  };
}
