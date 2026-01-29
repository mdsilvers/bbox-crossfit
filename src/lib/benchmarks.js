// CrossFit Benchmark WODs
// These are the standard CrossFit "Girl" WODs, strength benchmarks, and cardio tests

export const BENCHMARK_WODS = {
  girls: [
    {
      name: 'Angie',
      type: 'For Time',
      movements: [
        { name: 'Pull-up', reps: '100', notes: '' },
        { name: 'Push-up', reps: '100', notes: '' },
        { name: 'Sit-up', reps: '100', notes: '' },
        { name: 'Air Squat', reps: '100', notes: '' }
      ]
    },
    {
      name: 'Barbara',
      type: 'For Time',
      movements: [
        { name: 'Pull-up', reps: '5x20', notes: '5 Rounds' },
        { name: 'Push-up', reps: '5x30', notes: '' },
        { name: 'Sit-up', reps: '5x40', notes: '' },
        { name: 'Air Squat', reps: '5x50', notes: 'Rest 3:00 between rounds' }
      ]
    },
    {
      name: 'Chelsea',
      type: 'EMOM',
      movements: [
        { name: 'Pull-up', reps: '5', notes: 'EMOM 30 min' },
        { name: 'Push-up', reps: '10', notes: '' },
        { name: 'Air Squat', reps: '15', notes: 'Score = rounds completed' }
      ]
    },
    {
      name: 'Diane',
      type: 'For Time',
      movements: [
        { name: 'Deadlift', reps: '21-15-9', notes: 'Rx: 225/155 lb' },
        { name: 'Handstand Push-up', reps: '21-15-9', notes: '' }
      ]
    },
    {
      name: 'Elizabeth',
      type: 'For Time',
      movements: [
        { name: 'Clean', reps: '21-15-9', notes: 'Rx: 135/95 lb' },
        { name: 'Ring Dip', reps: '21-15-9', notes: '' }
      ]
    },
    {
      name: 'Fran',
      type: 'For Time',
      movements: [
        { name: 'Thruster', reps: '21-15-9', notes: 'Rx: 95/65 lb' },
        { name: 'Pull-up', reps: '21-15-9', notes: '' }
      ]
    },
    {
      name: 'Grace',
      type: 'For Time',
      movements: [
        { name: 'Clean and Jerk', reps: '30', notes: 'Rx: 135/95 lb' }
      ]
    },
    {
      name: 'Helen',
      type: 'For Time',
      movements: [
        { name: 'Run', reps: '3x400m', notes: '3 Rounds' },
        { name: 'Kettlebell Swing', reps: '3x21', notes: 'Rx: 53/35 lb (1.5/1 pood)' },
        { name: 'Pull-up', reps: '3x12', notes: '' }
      ]
    },
    {
      name: 'Isabel',
      type: 'For Time',
      movements: [
        { name: 'Snatch', reps: '30', notes: 'Rx: 135/95 lb' }
      ]
    },
    {
      name: 'Jackie',
      type: 'For Time',
      movements: [
        { name: 'Row', reps: '1000m', notes: '' },
        { name: 'Thruster', reps: '50', notes: 'Rx: 45/35 lb' },
        { name: 'Pull-up', reps: '30', notes: '' }
      ]
    },
    {
      name: 'Karen',
      type: 'For Time',
      movements: [
        { name: 'Wall Ball', reps: '150', notes: 'Rx: 20/14 lb to 10/9 ft' }
      ]
    },
    {
      name: 'Linda',
      type: 'For Time',
      movements: [
        { name: 'Deadlift', reps: '10-9-8-7-6-5-4-3-2-1', notes: 'Rx: 1.5x bodyweight' },
        { name: 'Bench Press', reps: '10-9-8-7-6-5-4-3-2-1', notes: 'Rx: 1x bodyweight' },
        { name: 'Clean', reps: '10-9-8-7-6-5-4-3-2-1', notes: 'Rx: 0.75x bodyweight (3 Bars of Death)' }
      ]
    },
    {
      name: 'Mary',
      type: 'AMRAP',
      movements: [
        { name: 'Handstand Push-up', reps: '5', notes: 'AMRAP 20' },
        { name: 'Pistol', reps: '10', notes: 'Alternating' },
        { name: 'Pull-up', reps: '15', notes: '' }
      ]
    },
    {
      name: 'Nancy',
      type: 'For Time',
      movements: [
        { name: 'Run', reps: '5x400m', notes: '5 Rounds' },
        { name: 'Overhead Squat', reps: '5x15', notes: 'Rx: 95/65 lb' }
      ]
    },
    {
      name: 'Annie',
      type: 'For Time',
      movements: [
        { name: 'Double Under', reps: '50-40-30-20-10', notes: '' },
        { name: 'Sit-up', reps: '50-40-30-20-10', notes: '' }
      ]
    },
    {
      name: 'Eva',
      type: 'For Time',
      movements: [
        { name: 'Run', reps: '5x800m', notes: '5 Rounds' },
        { name: 'Kettlebell Swing', reps: '5x30', notes: 'Rx: 70/53 lb (2/1.5 pood)' },
        { name: 'Pull-up', reps: '5x30', notes: '' }
      ]
    },
    {
      name: 'Kelly',
      type: 'For Time',
      movements: [
        { name: 'Run', reps: '5x400m', notes: '5 Rounds' },
        { name: 'Box Jump', reps: '5x30', notes: 'Rx: 24/20 in' },
        { name: 'Wall Ball', reps: '5x30', notes: 'Rx: 20/14 lb' }
      ]
    },
    {
      name: 'Lynne',
      type: 'Strength',
      movements: [
        { name: 'Bench Press', reps: '5 rounds max', notes: 'Rx: Bodyweight' },
        { name: 'Pull-up', reps: '5 rounds max', notes: 'Rest as needed, score = total reps' }
      ]
    },
    {
      name: 'Nicole',
      type: 'AMRAP',
      movements: [
        { name: 'Run', reps: '400m', notes: 'AMRAP 20' },
        { name: 'Pull-up', reps: 'Max', notes: 'Score = total pull-ups' }
      ]
    },
    {
      name: 'Cindy',
      type: 'AMRAP',
      movements: [
        { name: 'Pull-up', reps: '5', notes: 'AMRAP 20' },
        { name: 'Push-up', reps: '10', notes: '' },
        { name: 'Air Squat', reps: '15', notes: '' }
      ]
    },
    {
      name: 'Christine',
      type: 'For Time',
      movements: [
        { name: 'Row', reps: '3x500m', notes: '3 Rounds' },
        { name: 'Deadlift', reps: '3x12', notes: 'Rx: Bodyweight' },
        { name: 'Box Jump', reps: '3x21', notes: 'Rx: 24/20 in' }
      ]
    },
    {
      name: 'Amanda',
      type: 'For Time',
      movements: [
        { name: 'Muscle-up', reps: '9-7-5', notes: '' },
        { name: 'Squat Snatch', reps: '9-7-5', notes: 'Rx: 135/95 lb' }
      ]
    },
    {
      name: 'Gwen',
      type: 'Strength',
      movements: [
        { name: 'Clean and Jerk', reps: '15-12-9', notes: 'Touch-and-go, same load, score = max weight' }
      ]
    },
    {
      name: 'Grettel',
      type: 'For Time',
      movements: [
        { name: 'Clean and Jerk', reps: '10x3', notes: '10 Rounds, Rx: 135/95 lb' },
        { name: 'Burpee', reps: '10x3', notes: 'Bar-facing burpees' }
      ]
    },
    {
      name: 'Ingrid',
      type: 'For Time',
      movements: [
        { name: 'Snatch', reps: '10x3', notes: '10 Rounds, Rx: 135/95 lb' },
        { name: 'Burpee', reps: '10x3', notes: 'Bar-over burpees' }
      ]
    },
    {
      name: 'Barbara Ann',
      type: 'For Time',
      movements: [
        { name: 'Handstand Push-up', reps: '5x20', notes: '5 Rounds' },
        { name: 'Deadlift', reps: '5x30', notes: 'Rx: 135/95 lb' },
        { name: 'Sit-up', reps: '5x40', notes: '' },
        { name: 'Double Under', reps: '5x50', notes: 'Rest 3:00 between rounds' }
      ]
    },
    {
      name: 'Lyla',
      type: 'For Time',
      movements: [
        { name: 'Muscle-up', reps: '10-9-8-7-6-5-4-3-2-1', notes: '' },
        { name: 'Clean and Jerk', reps: '10-9-8-7-6-5-4-3-2-1', notes: 'Rx: Bodyweight' }
      ]
    },
    {
      name: 'Ellen',
      type: 'For Time',
      movements: [
        { name: 'Burpee', reps: '3x20', notes: '3 Rounds' },
        { name: 'Dumbbell Snatch', reps: '3x21', notes: 'Rx: 50/35 lb, alternating' },
        { name: 'Dumbbell Thruster', reps: '3x12', notes: 'Rx: 50/35 lb, dual' }
      ]
    },
    {
      name: 'Andi',
      type: 'For Time',
      movements: [
        { name: 'Hang Power Snatch', reps: '100', notes: 'Rx: 65/45 lb' },
        { name: 'Push Press', reps: '100', notes: 'Rx: 65/45 lb' },
        { name: 'Sumo Deadlift High Pull', reps: '100', notes: 'Rx: 65/45 lb' },
        { name: 'Front Squat', reps: '100', notes: 'Rx: 65/45 lb' }
      ]
    },
    {
      name: 'Lane',
      type: 'Strength',
      movements: [
        { name: 'Hang Power Snatch', reps: '5 rounds max', notes: 'Rx: 3/4 bodyweight' },
        { name: 'Handstand Push-up', reps: '5 rounds max', notes: 'Rest as needed, score = total reps' }
      ]
    }
  ],

  strength: [
    {
      name: '3RM Deadlift',
      type: 'Strength',
      movements: [
        { name: 'Deadlift', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Strict Press',
      type: 'Strength',
      movements: [
        { name: 'Strict Press', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Push Press',
      type: 'Strength',
      movements: [
        { name: 'Push Press', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Power Clean',
      type: 'Strength',
      movements: [
        { name: 'Power Clean', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Squat Clean',
      type: 'Strength',
      movements: [
        { name: 'Squat Clean', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Clean & Jerk',
      type: 'Strength',
      movements: [
        { name: 'Clean and Jerk', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Snatch',
      type: 'Strength',
      movements: [
        { name: 'Snatch', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Front Squat',
      type: 'Strength',
      movements: [
        { name: 'Front Squat', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Back Squat',
      type: 'Strength',
      movements: [
        { name: 'Back Squat', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    },
    {
      name: '3RM Bench',
      type: 'Strength',
      movements: [
        { name: 'Bench Press', reps: '3RM', notes: 'Work up to a 3-rep max' }
      ]
    }
  ],

  cardio: [
    {
      name: '500m Row',
      type: 'For Time',
      movements: [
        { name: 'Row', reps: '500m', notes: 'Max effort' }
      ]
    },
    {
      name: '1K Row',
      type: 'For Time',
      movements: [
        { name: 'Row', reps: '1000m', notes: 'Max effort' }
      ]
    },
    {
      name: '2K Row',
      type: 'For Time',
      movements: [
        { name: 'Row', reps: '2000m', notes: 'Max effort' }
      ]
    },
    {
      name: '5K Row',
      type: 'For Time',
      movements: [
        { name: 'Row', reps: '5000m', notes: 'Max effort' }
      ]
    },
    {
      name: '50 Cal Bike',
      type: 'For Time',
      movements: [
        { name: 'Assault Bike', reps: '50 calories', notes: 'Max effort' }
      ]
    },
    {
      name: '20/10 Bike Tabata',
      type: 'EMOM',
      movements: [
        { name: 'Assault Bike', reps: '8 rounds', notes: '20 sec work / 10 sec rest, score = lowest calories' }
      ]
    }
  ]
};

// Flat array of all benchmarks for easy searching
export const ALL_BENCHMARKS = [
  ...BENCHMARK_WODS.girls,
  ...BENCHMARK_WODS.strength,
  ...BENCHMARK_WODS.cardio
];

// Get benchmark by name (case-insensitive)
export const getBenchmarkByName = (name) => {
  if (!name) return null;
  const normalizedName = name.trim().toLowerCase();
  return ALL_BENCHMARKS.find(b => b.name.toLowerCase() === normalizedName);
};

// Check if a WOD name is a benchmark (case-insensitive)
export const isBenchmarkWod = (name) => {
  return getBenchmarkByName(name) != null;
};

// Get all benchmark names for validation
export const getAllBenchmarkNames = () => {
  return ALL_BENCHMARKS.map(b => b.name);
};

// Get benchmarks grouped by category (for dropdown display)
export const getBenchmarksByCategory = () => {
  return {
    'Girl WODs': BENCHMARK_WODS.girls,
    'Strength': BENCHMARK_WODS.strength,
    'Cardio': BENCHMARK_WODS.cardio
  };
};
