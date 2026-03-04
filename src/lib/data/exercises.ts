import type { Exercise } from '$lib/types';

export const EXERCISES: Exercise[] = [
  {
    id: 'squat',
    name: 'Barbell Squat',
    category: 'legs',
    primaryMuscles: ['quads', 'glutes', 'core'],
    equipment: ['barbell', 'squat-rack'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },      // empty bar (20kg)
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 },
      { percentOfWork: 0.80, reps: 3 }     // minimum 3 reps for effective warmup
    ]
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'push',
    primaryMuscles: ['chest', 'triceps', 'front-delts'],
    equipment: ['barbell', 'bench'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 },
      { percentOfWork: 0.80, reps: 3 }
    ]
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    category: 'pull',
    primaryMuscles: ['back', 'biceps', 'rear-delts'],
    equipment: ['barbell'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 },
      { percentOfWork: 0.80, reps: 3 }
    ]
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'push',
    primaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbell'],
    defaultProgression: {
      incrementKg: 1.25,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 },
      { percentOfWork: 0.80, reps: 1 }
    ]
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'pull',
    primaryMuscles: ['posterior-chain', 'back', 'grip'],
    equipment: ['barbell'],
    defaultProgression: {
      incrementKg: 5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 5 },
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 },
      { percentOfWork: 0.80, reps: 1 }
    ]
  },
  // Alternative exercises for LLM substitutions
  {
    id: 'dumbbell-press',
    name: 'Dumbbell Bench Press',
    category: 'push',
    primaryMuscles: ['chest', 'triceps'],
    equipment: ['dumbbells', 'bench'],
    defaultProgression: {
      incrementKg: 2,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.50, reps: 8 },
      { percentOfWork: 0.75, reps: 3 }
    ]
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'legs',
    primaryMuscles: ['quads', 'glutes'],
    equipment: ['leg-press'],
    defaultProgression: {
      incrementKg: 5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.50, reps: 8 },
      { percentOfWork: 0.75, reps: 3 }
    ]
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    primaryMuscles: ['back', 'biceps'],
    equipment: ['cable-machine'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.50, reps: 5 },
      { percentOfWork: 0.75, reps: 3 }
    ]
  },
  {
    id: 'romaninan-deadlift',
    name: 'Romanian Deadlift',
    category: 'pull',
    primaryMuscles: ['hamstrings', 'glutes', 'back'],
    equipment: ['barbell'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.50, reps: 5 },
      { percentOfWork: 0.75, reps: 3 }
    ]
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'legs',
    primaryMuscles: ['quads', 'glutes'],
    equipment: ['dumbbells', 'kettlebells'],
    defaultProgression: {
      incrementKg: 2,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.60, reps: 5 }
    ]
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    category: 'pull',
    primaryMuscles: ['back', 'biceps'],
    equipment: ['pull-up-bar'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 5 },
      { percentOfWork: 0.50, reps: 3 }
    ],
    supportsBodyweightProgression: true,
    defaultReps: 8,
    defaultIncrementReps: 1
  },
  {
    id: 'dip',
    name: 'Dip',
    category: 'push',
    primaryMuscles: ['chest', 'triceps'],
    equipment: ['dip-bars'],
    defaultProgression: {
      incrementKg: 1.25,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.50, reps: 3 }
    ]
  },
  // Additional exercises from Stronglifts import
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    category: 'pull',
    primaryMuscles: ['biceps'],
    equipment: ['dumbbells'],
    defaultProgression: {
      incrementKg: 1,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.60, reps: 8 }
    ],
    defaultReps: 10,
    defaultIncrementReps: 1
  },
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    category: 'pull',
    primaryMuscles: ['biceps'],
    equipment: ['barbell'],
    defaultProgression: {
      incrementKg: 2,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.50, reps: 8 }
    ],
    defaultReps: 10,
    defaultIncrementReps: 1
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    primaryMuscles: ['core', 'abs'],
    equipment: [],
    defaultProgression: {
      incrementKg: 5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [],
    isTimeBased: true,
    defaultTimeSeconds: 60
  },
  {
    id: 'lunge',
    name: 'Lunges',
    category: 'legs',
    primaryMuscles: ['quads', 'glutes'],
    equipment: ['dumbbells'],
    defaultProgression: {
      incrementKg: 2,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 }
    ]
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    category: 'push',
    primaryMuscles: ['chest', 'shoulders'],
    equipment: ['barbell', 'bench'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.50, reps: 5 },
      { percentOfWork: 0.75, reps: 2 }
    ]
  },
  {
    id: 'hanging-knee-raise',
    name: 'Hanging Knee Raise',
    category: 'core',
    primaryMuscles: ['abs', 'hip-flexors'],
    equipment: ['pull-up-bar'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [],
    supportsBodyweightProgression: true,
    defaultReps: 10,
    defaultIncrementReps: 2
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    category: 'pull',
    primaryMuscles: ['posterior-chain', 'glutes'],
    equipment: ['kettlebells'],
    defaultProgression: {
      incrementKg: 2,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.50, reps: 8 },
      { percentOfWork: 0.75, reps: 5 }
    ]
  },
  {
    id: 'sumo-deadlift',
    name: 'Sumo Deadlift',
    category: 'pull',
    primaryMuscles: ['posterior-chain', 'quads'],
    equipment: ['barbell'],
    defaultProgression: {
      incrementKg: 5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 }
    ]
  },
  {
    id: 'seated-row',
    name: 'Seated Row',
    category: 'pull',
    primaryMuscles: ['back', 'biceps'],
    equipment: ['cable-machine'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.60, reps: 5 }
    ]
  },
  {
    id: 'dumbbell-fly',
    name: 'Dumbbell Fly',
    category: 'push',
    primaryMuscles: ['chest'],
    equipment: ['dumbbells', 'bench'],
    defaultProgression: {
      incrementKg: 1,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.60, reps: 5 }
    ]
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    category: 'core',
    primaryMuscles: ['obliques', 'core'],
    equipment: [],
    defaultProgression: {
      incrementKg: 0,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [],
    isTimeBased: true,
    defaultTimeSeconds: 45
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    category: 'legs',
    primaryMuscles: ['calves'],
    equipment: ['cable-machine'],
    defaultProgression: {
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: [
      { percentOfWork: 0.60, reps: 8 }
    ],
    defaultReps: 12,
    defaultIncrementReps: 2
  }
];

export const DEFAULT_WORKOUT_A = ['squat', 'bench-press', 'barbell-row'];
export const DEFAULT_WORKOUT_B = ['squat', 'overhead-press', 'deadlift'];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id);
}

export function getExercisesByEquipment(equipment: string[]): Exercise[] {
  return EXERCISES.filter(e => 
    e.equipment.some(eq => equipment.includes(eq))
  );
}

// Default bar weight in kg
export const BAR_WEIGHT = 20;

// Calculate plate weight needed per side for barbell exercises
export function getPlateWeightPerSide(totalWeight: number, exerciseId: string): number | null {
  const exercise = getExerciseById(exerciseId);
  if (!exercise || !exercise.equipment.includes('barbell')) {
    return null; // Not a barbell exercise
  }
  
  const platesTotal = totalWeight - BAR_WEIGHT;
  if (platesTotal <= 0) {
    return 0; // Just the bar
  }
  
  return platesTotal / 2;
}
