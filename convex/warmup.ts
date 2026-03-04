// Warmup calculation for Convex (duplicated to avoid $lib alias issues)
import { getExerciseById } from "./exercises";

const BAR_WEIGHT = 20; // kg
const MIN_PLATE = 2.5; // kg

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

  const sets: WorkoutSet[] = [];
  let setNumber = 1;

  for (const step of exercise.warmupFormula) {
    let weight: number;
    
    if (step.percentOfWork === 0) {
      weight = BAR_WEIGHT;
    } else {
      const rawWeight = workWeight * step.percentOfWork;
      weight = Math.round(rawWeight / (MIN_PLATE * 2)) * (MIN_PLATE * 2);
    }

    if (weight < workWeight - MIN_PLATE && !sets.find((s: WorkoutSet) => s.targetWeight === weight)) {
      sets.push({
        id: `warmup-${setNumber}`,
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
  const warmupSets = calculateWarmupSets(exerciseId, weight);
  const workSetsList = calculateWorkSets(
    exerciseId, 
    workSets, 
    reps, 
    weight, 
    warmupSets.length + 1
  );
  
  return [...warmupSets, ...workSetsList];
}
