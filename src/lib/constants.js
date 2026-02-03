// Return today's date as YYYY-MM-DD in local timezone (not UTC)
export function getLocalToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Standard CrossFit movements list
export const STANDARD_MOVEMENTS = [
  // Gymnastics
  'Air Squat', 'Pull-up', 'Push-up', 'Sit-up', 'Ring Dip', 'Muscle-up',
  'Bar Muscle-up', 'Ring Muscle-up', 'Handstand Push-up', 'Strict Handstand Push-up',
  'Kipping Handstand Push-up', 'Pistol', 'Toes-to-Bar', 'Knees-to-Elbow',
  'Chest-to-Bar Pull-up', 'Butterfly Pull-up', 'Strict Pull-up', 'L-Sit',
  'Rope Climb', 'Legless Rope Climb', 'Burpee', 'Burpee Box Jump', 'Burpee Pull-up',
  'Box Jump', 'Box Jump Over', 'Box Step-up', 'Jumping Lunge', 'Walking Lunge',

  // Olympic Weightlifting
  'Snatch', 'Power Snatch', 'Squat Snatch', 'Hang Snatch', 'Hang Power Snatch',
  'Clean', 'Power Clean', 'Squat Clean', 'Hang Clean', 'Hang Power Clean',
  'Clean and Jerk', 'Jerk', 'Push Jerk', 'Split Jerk', 'Overhead Squat',

  // Barbell
  'Deadlift', 'Sumo Deadlift High Pull', 'Thruster', 'Front Squat', 'Back Squat',
  'Overhead Squat', 'Bench Press', 'Strict Press', 'Push Press', 'Good Morning',
  'Pendlay Row', 'Bent-Over Row', 'Romanian Deadlift', 'Hang Clean Pull',

  // Dumbbell/Kettlebell
  'Dumbbell Snatch', 'Dumbbell Clean', 'Dumbbell Thruster', 'Devil Press',
  'Dumbbell Box Step-up', 'Kettlebell Swing', 'American Kettlebell Swing',
  'Russian Kettlebell Swing', 'Kettlebell Snatch', 'Goblet Squat',
  'Turkish Get-up', 'Single-Arm Dumbbell Row',

  // Monostructural/Cardio
  'Run', 'Row', 'Bike', 'Assault Bike', 'Echo Bike', 'Ski Erg', 'Jump Rope',
  'Double Under', 'Single Under', 'Triple Under', 'Swimming',

  // Other
  'Wall Ball', 'Medicine Ball Clean', 'GHD Sit-up', 'Back Extension',
  'Hip Extension', 'Slam Ball', 'Sandbag Carry', 'Farmer Carry',
  'Sled Push', 'Sled Pull', 'Yoke Carry'
].sort();
