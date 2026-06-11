export function calculateStats(workoutResults, currentUser) {
  const myWorkouts = workoutResults.filter(r => r.athleteEmail === currentUser?.email);

  const totalWorkouts = myWorkouts.length;
  const now = new Date();

  // Parse YYYY-MM-DD as local midnight — bare new Date(str) parses as UTC
  // and shifts the calendar day for non-UTC timezones
  const thisMonth = myWorkouts.filter(r => {
    const resultDate = new Date(r.date + 'T00:00:00');
    return resultDate.getMonth() === now.getMonth() &&
           resultDate.getFullYear() === now.getFullYear();
  }).length;

  const thisWeek = myWorkouts.filter(r => {
    const resultDate = new Date(r.date + 'T00:00:00');
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return resultDate >= weekAgo;
  }).length;

  const thisYear = myWorkouts.filter(r => {
    const resultDate = new Date(r.date + 'T00:00:00');
    return resultDate.getFullYear() === now.getFullYear();
  }).length;

  const weeklyStreak = thisWeek;

  const movementCounts = {};
  myWorkouts.forEach(result => {
    result.movements.forEach(movement => {
      if (movement.name) {
        movementCounts[movement.name] = (movementCounts[movement.name] || 0) + 1;
      }
    });
  });

  const topMovements = Object.entries(movementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalWorkouts,
    thisMonth,
    thisWeek,
    thisYear,
    currentStreak: weeklyStreak,
    topMovements
  };
}
