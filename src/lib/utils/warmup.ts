import type { WorkoutSet } from '$lib/types';
import { getExerciseById } from '$lib/data/exercises';
import { BAR_WEIGHT, roundToAchievableWeight } from './plates';

// Minimum number of warmup sets for weighted exercises
const MIN_WARMUP_SETS = 3;

export function calculateWarmupSets(exerciseId: string, workWeight: number): WorkoutSet[] {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [];

  // Skip warmups for bodyweight-only exercises
  const isBodyweightOnly = exercise.equipment.length === 1 && exercise.equipment[0] === 'bodyweight';
  if (isBodyweightOnly) return [];

  // For very light weights (just the bar or close to it), minimal warmup
  if (workWeight <= BAR_WEIGHT + 5) {
    return [{
      id: `${exerciseId}-warmup-1`,
      exerciseId,
      setNumber: 1,
      type: 'warmup',
      targetReps: 10,
      targetWeight: BAR_WEIGHT,
      failed: false
    }];
  }

  const sets: WorkoutSet[] = [];
  let setNumber = 1;

  // Generate warmup sets from formula
  for (const step of exercise.warmupFormula) {
    let weight: number;
    
    if (step.percentOfWork === 0) {
      // Empty bar
      weight = BAR_WEIGHT;
    } else {
      // Calculate percentage and round to achievable weight with available plates
      const rawWeight = workWeight * step.percentOfWork;
      weight = roundToAchievableWeight(rawWeight);
    }

    // Only add if weight is less than work weight and not duplicate
    if (weight < workWeight && !sets.find(s => s.targetWeight === weight)) {
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

  // Ensure at least MIN_WARMUP_SETS by adding intermediate steps if needed
  if (sets.length < MIN_WARMUP_SETS) {
    const isBarbell = exercise.equipment.includes('barbell');
    
    // Always start with empty bar for barbell exercises if not already there
    if (isBarbell && !sets.find(s => s.targetWeight === BAR_WEIGHT)) {
      sets.unshift({
        id: `${exerciseId}-warmup-1`,
        exerciseId,
        setNumber: 1,
        type: 'warmup',
        targetReps: 10,
        targetWeight: BAR_WEIGHT,
        failed: false
      });
      // Renumber sets
      sets.forEach((s, i) => { s.setNumber = i + 1; });
    }
    
    // Add intermediate sets if still not enough
    while (sets.length < MIN_WARMUP_SETS) {
      const lastSet = sets[sets.length - 1];
      const remainingGap = workWeight - lastSet.targetWeight;
      
      // Add a set at roughly halfway between last warmup and work weight
      let nextWeight: number;
      if (isBarbell) {
        // For barbell, make meaningful jumps (at least 10kg, but not too close to work weight)
        const jump = Math.max(10, Math.floor(remainingGap / 3));
        nextWeight = roundToAchievableWeight(lastSet.targetWeight + jump);
      } else {
        // For other equipment, use percentage-based jumps
        nextWeight = Math.round(lastSet.targetWeight + remainingGap * 0.5);
      }
      
      // Don't add if too close to work weight
      if (nextWeight >= workWeight - 2.5 || nextWeight <= lastSet.targetWeight + 2.5) {
        break;
      }
      
      // Insert at the end, before work sets
      sets.push({
        id: `${exerciseId}-warmup-${sets.length + 1}`,
        exerciseId,
        setNumber: sets.length + 1,
        type: 'warmup',
        targetReps: lastSet.targetReps > 3 ? 3 : lastSet.targetReps, // taper reps
        targetWeight: nextWeight,
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
