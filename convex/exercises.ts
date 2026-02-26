// Exercise definitions for Convex (duplicated to avoid $lib alias issues)

export interface Exercise {
  id: string;
  name: string;
  category: 'legs' | 'push' | 'pull' | 'core';
  primaryMuscles: string[];
  equipment: string[];
  defaultProgression: {
    incrementKg: number;
    deloadAfterFailures: number;
    deloadPercent: number;
  };
  warmupFormula: Array<{
    percentOfWork: number;
    reps: number;
  }>;
}

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
      { percentOfWork: 0, reps: 10 },
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 },
      { percentOfWork: 0.80, reps: 1 }
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
      { percentOfWork: 0.80, reps: 1 }
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
      { percentOfWork: 0.80, reps: 1 }
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
      { percentOfWork: 0.50, reps: 3 },
      { percentOfWork: 0.70, reps: 1 }
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
      { percentOfWork: 0.40, reps: 5 },
      { percentOfWork: 0.60, reps: 3 }
    ]
  },
  // Additional exercises for import compatibility
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
      { percentOfWork: 0.60, reps: 5 },
      { percentOfWork: 0.80, reps: 2 }
    ]
  },
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
      { percentOfWork: 0.60, reps: 5 }
    ]
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
      { percentOfWork: 0.50, reps: 5 }
    ]
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
    warmupFormula: []
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
      incrementKg: 0,
      deloadAfterFailures: 3,
      deloadPercent: 0.10
    },
    warmupFormula: []
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
      { percentOfWork: 0.60, reps: 5 }
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
    warmupFormula: []
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
      { percentOfWork: 0.60, reps: 5 }
    ]
  }
];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e: Exercise) => e.id === id);
}
