// Warmup calculation for Convex (uses proper plate rounding)
import { getExerciseById } from "./exercises";
import { BAR_WEIGHT, roundToAchievableWeight } from "./plates";

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  type: 'warmup' | 'work';
  targetReps: number;
  targetWeight: number;
  targetTimeSeconds?: number;
  completedReps?: number;
  completedTimeSeconds?: number;
  completedAt?: number;
  failed: boolean;
  skipped?: boolean;
}

export function calculateWarmupSets(exerciseId: string, workWeight: number): WorkoutSet[] {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [];

  // Skip warmups for bodyweight-only exercises (no equipment or only 'bodyweight' listed)
  const isBodyweightOnly = exercise.equipment.length === 0 || 
    (exercise.equipment.length === 1 && exercise.equipment[0] === 'bodyweight');
  if (isBodyweightOnly) return [];

  // Skip warmups when doing bodyweight-only (0 added weight) for exercises that support it
  if (workWeight === 0) return [];

  const sets: WorkoutSet[] = [];
  let setNumber = 1;

  for (const step of exercise.warmupFormula) {
    let weight: number;
    
    if (step.percentOfWork === 0) {
      weight = BAR_WEIGHT;
    } else {
      // Calculate percentage and round to achievable weight with available plates
      const rawWeight = workWeight * step.percentOfWork;
      weight = roundToAchievableWeight(rawWeight);
    }

    // Only add if weight is less than work weight and not duplicate
    if (weight < workWeight && !sets.find((s: WorkoutSet) => s.targetWeight === weight)) {
      sets.push({
        id: `warmup-${setNumber}`,
        exerciseId,
        setNumber: setNumber++,
        type: 'warmup',
        targetReps: Math.max(2, step.reps),
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
  startSetNumber: number = 1
): WorkoutSet[] {
  return Array.from({ length: workSets }, (_: unknown, i: number) => ({
    id: `work-${i + 1}`,
    exerciseId,
    setNumber: startSetNumber + i,
    type: 'work',
    targetReps: reps,
    targetWeight: weight,
    failed: false
  }));
}

export function generateAllSets(
  exerciseId: string,
  workSets: number,
  reps: number,
  weight: number
): WorkoutSet[] {
  // Round work weight to achievable value
  const roundedWeight = roundToAchievableWeight(weight);
  
  const warmupSets = calculateWarmupSets(exerciseId, roundedWeight);
  const workSetsList = calculateWorkSets(
    exerciseId, 
    workSets, 
    reps, 
    roundedWeight, 
    warmupSets.length + 1
  );
  
  return [...warmupSets, ...workSetsList];
}
