import { useState, useCallback } from 'react';
import * as db from '../lib/database';
import { BADGES, calculateStreakWeeks, checkBadges } from '../lib/badges';

export function useBadges(currentUser) {
  const [myBadges, setMyBadges] = useState([]);
  const [allUserBadges, setAllUserBadges] = useState({});
  const [streakWeeks, setStreakWeeks] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [newBadgeToast, setNewBadgeToast] = useState(null);
  const [badgeCacheTime, setBadgeCacheTime] = useState(0);

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

      // Award new badges in a single batch call
      if (newBadgeKeys.length > 0) {
        await db.awardBadges(currentUser.id, newBadgeKeys);
        setMyBadges(prev => [...prev, ...newBadgeKeys]);
        const badge = BADGES.find(b => b.key === newBadgeKeys[0]);
        if (badge) {
          setNewBadgeToast(badge);
        }
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }, [currentUser, myBadges, bestStreak]);

  const loadAllUserBadges = useCallback(async () => {
    try {
      // Skip if cache is fresh (less than 5 minutes old)
      if (badgeCacheTime && Date.now() - badgeCacheTime < 5 * 60 * 1000) {
        return allUserBadges;
      }
      const grouped = await db.getAllUserBadges();
      setAllUserBadges(grouped);
      setBadgeCacheTime(Date.now());
      return grouped;
    } catch (error) {
      console.error('Error loading all user badges:', error);
      return {};
    }
  }, [badgeCacheTime, allUserBadges]);

  const dismissToast = useCallback(() => {
    setNewBadgeToast(null);
  }, []);

  return {
    myBadges,
    allUserBadges,
    streakWeeks,
    bestStreak,
    newBadgeToast,
    loadMyBadges,
    loadAllUserBadges,
    checkAndAwardBadges,
    dismissToast,
  };
}
