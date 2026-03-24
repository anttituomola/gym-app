import type { WorkoutSet } from '$lib/types';
import { getExerciseById } from '$lib/data/exercises';
import { BAR_WEIGHT, roundToAchievableWeight, findOptimalWarmupWeight, canBuildByAddingOnly, getPlateBreakdown } from './plates';

// Minimum number of warmup sets for weighted exercises
const MIN_WARMUP_SETS = 3;

export function calculateWarmupSets(exerciseId: string, workWeight: number): WorkoutSet[] {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [];

  // Skip warmups for bodyweight-only exercises (no equipment or only 'bodyweight' listed)
  const isBodyweightOnly = exercise.equipment.length === 0 || 
    (exercise.equipment.length === 1 && exercise.equipment[0] === 'bodyweight');
  if (isBodyweightOnly) return [];

  // Skip warmups when doing bodyweight-only (0 added weight) for exercises that support it
  if (workWeight === 0) return [];

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

  const isBarbell = exercise.equipment.includes('barbell');
  const sets: WorkoutSet[] = [];
  
  // Always start with empty bar for barbell exercises
  if (isBarbell) {
    sets.push({
      id: `${exerciseId}-warmup-1`,
      exerciseId,
      setNumber: 1,
      type: 'warmup',
      targetReps: 10,
      targetWeight: BAR_WEIGHT,
      failed: false
    });
  }

  // For barbell exercises, use optimized plate-loading algorithm
  if (isBarbell) {
    // Target percentages for warmup sets (before work weight)
    const targetPercentages = [0.40, 0.60, 0.80]; // 40%, 60%, 80% of work weight
    const repsForStep = [5, 3, 2]; // Reps taper as weight increases, min 2 reps
    
    let currentWeight = BAR_WEIGHT;
    let stepIndex = 0;
    
    // Keep adding warmup sets until we're close to work weight
    while (currentWeight < workWeight - 10 && stepIndex < targetPercentages.length) {
      const targetPercent = targetPercentages[stepIndex];
      const targetWeight = workWeight * targetPercent;
      
      // Find optimal weight that builds on current weight
      // Allow slight overshoot (up to 5kg) if it means simpler plate loading
      const optimalWeight = findOptimalWarmupWeight(currentWeight, targetWeight, 5);
      
      // Only add if it's a meaningful increase (at least 5kg)
      if (optimalWeight > currentWeight + 4) {
        sets.push({
          id: `${exerciseId}-warmup-${sets.length + 1}`,
          exerciseId,
          setNumber: sets.length + 1,
          type: 'warmup',
          targetReps: repsForStep[stepIndex] || 3,
          targetWeight: optimalWeight,
          failed: false
        });
        currentWeight = optimalWeight;
      }
      
      stepIndex++;
    }
    
    // Ensure we have at least MIN_WARMUP_SETS
    while (sets.length < MIN_WARMUP_SETS && currentWeight < workWeight - 10) {
      // Find a weight that's roughly halfway between current and work weight
      const gap = workWeight - currentWeight;
      const targetWeight = currentWeight + (gap * 0.5);
      
      const optimalWeight = findOptimalWarmupWeight(currentWeight, targetWeight, 2.5);
      
      if (optimalWeight > currentWeight + 4 && optimalWeight < workWeight - 2.5) {
        sets.push({
          id: `${exerciseId}-warmup-${sets.length + 1}`,
          exerciseId,
          setNumber: sets.length + 1,
          type: 'warmup',
          targetReps: Math.max(3, 5 - sets.length), // Taper reps, min 3
          targetWeight: optimalWeight,
          failed: false
        });
        currentWeight = optimalWeight;
      } else {
        break;
      }
    }
  } else {
    // For non-barbell equipment (dumbbells, machines), use percentage-based approach
    // but still ensure progressive loading
    for (const step of exercise.warmupFormula) {
      let weight: number;
      
      if (step.percentOfWork === 0) {
        weight = Math.min(workWeight * 0.3, 20); // Light weight or bodyweight
      } else {
        const rawWeight = workWeight * step.percentOfWork;
        weight = Math.round(rawWeight);
      }

      // Only add if weight is less than work weight and not duplicate
      if (weight < workWeight && !sets.find(s => s.targetWeight === weight)) {
        sets.push({
          id: `${exerciseId}-warmup-${sets.length + 1}`,
          exerciseId,
          setNumber: sets.length + 1,
          type: 'warmup',
          targetReps: step.reps,
          targetWeight: weight,
          failed: false
        });
      }
    }
    
    // Ensure minimum warmup sets for non-barbell too
    while (sets.length < MIN_WARMUP_SETS) {
      const lastSet = sets[sets.length - 1];
      const nextWeight = Math.round(lastSet.targetWeight + (workWeight - lastSet.targetWeight) * 0.4);
      
      if (nextWeight >= workWeight - 2 || nextWeight <= lastSet.targetWeight) {
        break;
      }
      
      sets.push({
        id: `${exerciseId}-warmup-${sets.length + 1}`,
        exerciseId,
        setNumber: sets.length + 1,
        type: 'warmup',
        targetReps: Math.max(3, lastSet.targetReps - 2),
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
  const exercise = getExerciseById(exerciseId);
  const isBarbell = exercise?.equipment.includes('barbell') ?? false;
  
  // Round weight to achievable value for barbell exercises
  // This ensures the weight can be made with available plates
  const roundedWeight = isBarbell ? roundToAchievableWeight(weight) : weight;
  
  // Time-based exercises don't have warmup sets
  const warmupSets = timeSeconds ? [] : calculateWarmupSets(exerciseId, roundedWeight);
  const workSetsList = calculateWorkSets(
    exerciseId, 
    workSets, 
    reps, 
    roundedWeight, 
    warmupSets.length + 1,
    timeSeconds
  );
  
  return [...warmupSets, ...workSetsList];
}

export function formatWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): string {
  return `${weight} ${unit}`;
}
