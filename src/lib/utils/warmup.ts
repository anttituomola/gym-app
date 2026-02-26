import type { WorkoutSet } from '$lib/types';
import { getExerciseById } from '$lib/data/exercises';

const BAR_WEIGHT = 20; // kg
const MIN_PLATE = 2.5; // kg (smallest plate on each side)

export function calculateWarmupSets(exerciseId: string, workWeight: number): WorkoutSet[] {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [];

  const sets: WorkoutSet[] = [];
  let setNumber = 1;

  for (const step of exercise.warmupFormula) {
    let weight: number;
    
    if (step.percentOfWork === 0) {
      // Empty bar
      weight = BAR_WEIGHT;
    } else {
      // Calculate percentage and round to nearest plate increment
      const rawWeight = workWeight * step.percentOfWork;
      weight = Math.round(rawWeight / (MIN_PLATE * 2)) * (MIN_PLATE * 2);
    }

    // Only add if weight is less than work weight and not duplicate
    if (weight < workWeight - MIN_PLATE && !sets.find(s => s.targetWeight === weight)) {
      sets.push({
        id: `${exerciseId}-warmup-${setNumber}`,
        exerciseId,
        setNumber: setNumber++,
        type: 'warmup',
        targetReps: step.reps,
        targetWeight: weight,
        failed: false
      });
    }
  }

  return sets;
}

export function calculateWorkSets(
  exerciseId: string, 
  workSets: number, 
  reps: number, 
  weight: number,
  startSetNumber: number = 1,
  timeSeconds?: number
): WorkoutSet[] {
  return Array.from({ length: workSets }, (_, i) => ({
    id: `${exerciseId}-work-${i + 1}`,
    exerciseId,
    setNumber: startSetNumber + i,
    type: 'work',
    targetReps: timeSeconds ? 0 : reps,
    targetWeight: weight,
    targetTimeSeconds: timeSeconds,
    failed: false
  }));
}

export function generateAllSets(
  exerciseId: string,
  workSets: number,
  reps: number,
  weight: number,
  timeSeconds?: number
): WorkoutSet[] {
  // Time-based exercises don't have warmup sets
  const warmupSets = timeSeconds ? [] : calculateWarmupSets(exerciseId, weight);
  const workSetsList = calculateWorkSets(
    exerciseId, 
    workSets, 
    reps, 
    weight, 
    warmupSets.length + 1,
    timeSeconds
  );
  
  return [...warmupSets, ...workSetsList];
}

export function formatWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): string {
  return `${weight} ${unit}`;
}
