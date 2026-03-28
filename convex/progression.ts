import { getExerciseById } from "./exercises";
import { roundToAchievableWeight } from "./plates";
import type { WorkoutSet } from "./warmup";

/** Mirrors userProfiles.exercises values used for progression */
export type ProfileExerciseSettings = {
  currentWeight: number;
  weightUnit: "kg" | "lbs";
  successCount: number;
  failureCount: number;
  incrementKg: number;
  deloadAfterFailures: number;
  deloadPercent: number;
  useBodyweightProgression?: boolean;
  targetReps?: number;
  incrementReps?: number;
  holdSeconds?: number;
  incrementHoldSeconds?: number;
};

export function defaultSettingsForExercise(
  exerciseId: string
): ProfileExerciseSettings | null {
  const def = getExerciseById(exerciseId);
  if (!def) return null;
  const base: ProfileExerciseSettings = {
    currentWeight: def.isTimeBased || def.supportsBodyweightProgression ? 0 : 20,
    weightUnit: "kg",
    successCount: 0,
    failureCount: 0,
    incrementKg: def.defaultProgression.incrementKg,
    deloadAfterFailures: def.defaultProgression.deloadAfterFailures,
    deloadPercent: def.defaultProgression.deloadPercent,
  };
  if (def.isTimeBased) {
    base.holdSeconds = def.defaultTimeSeconds ?? 60;
    base.incrementHoldSeconds = def.incrementTimeSeconds ?? 10;
  }
  if (def.supportsBodyweightProgression) {
    base.useBodyweightProgression = true;
    base.targetReps = def.defaultReps ?? 10;
    base.incrementReps = def.defaultIncrementReps ?? 1;
  }
  return base;
}

function workSetSuccessful(set: WorkoutSet): boolean {
  if (set.skipped) return false;
  if (set.targetTimeSeconds) {
    return (
      !set.failed &&
      set.completedTimeSeconds !== undefined &&
      set.completedTimeSeconds >= set.targetTimeSeconds
    );
  }
  return (
    !set.failed &&
    set.completedReps !== undefined &&
    set.completedReps >= set.targetReps
  );
}

/**
 * Updates a copy of the profile exercise map from a completed workout's plan + sets.
 * Deduplicates by exerciseId (first occurrence in plan wins).
 */
export function applyProgressionFromWorkout(
  exercises: Record<string, ProfileExerciseSettings>,
  plan: Array<{ exerciseId: string }>,
  allSets: WorkoutSet[]
): Record<string, ProfileExerciseSettings> {
  const out: Record<string, ProfileExerciseSettings> = { ...exercises };
  const seen = new Set<string>();

  for (const planItem of plan) {
    if (seen.has(planItem.exerciseId)) continue;

    const def = getExerciseById(planItem.exerciseId);
    if (!def) continue;

    const workSets = allSets.filter(
      (s) => s.exerciseId === planItem.exerciseId && s.type === "work"
    );
    if (workSets.length === 0) continue;

    seen.add(planItem.exerciseId);

    let settings = out[planItem.exerciseId];
    if (!settings) {
      const created = defaultSettingsForExercise(planItem.exerciseId);
      if (!created) continue;
      settings = created;
    } else {
      settings = { ...settings };
    }

    const allCompleted = workSets.every(workSetSuccessful);
    const anyFailed = workSets.some((s) => s.failed);

    const useBw =
      !!def.supportsBodyweightProgression &&
      settings.useBodyweightProgression !== false;

    if (allCompleted) {
      settings.successCount++;
      settings.failureCount = 0;
      if (settings.successCount >= 1) {
        if (def.isTimeBased) {
          const inc = settings.incrementHoldSeconds ?? def.incrementTimeSeconds ?? 10;
          const base = settings.holdSeconds ?? def.defaultTimeSeconds ?? 60;
          settings.holdSeconds = Math.min(600, base + inc);
        } else if (useBw) {
          const inc = settings.incrementReps ?? def.defaultIncrementReps ?? 1;
          const base = settings.targetReps ?? def.defaultReps ?? 10;
          settings.targetReps = Math.min(100, base + inc);
        } else {
          settings.currentWeight = roundToAchievableWeight(
            settings.currentWeight + settings.incrementKg
          );
        }
        settings.successCount = 0;
      }
    } else if (anyFailed) {
      settings.failureCount++;
      settings.successCount = 0;
      if (settings.failureCount >= settings.deloadAfterFailures) {
        if (def.isTimeBased) {
          const base = settings.holdSeconds ?? def.defaultTimeSeconds ?? 60;
          settings.holdSeconds = Math.max(
            10,
            Math.floor(base * (1 - settings.deloadPercent))
          );
        } else if (useBw) {
          const dec = settings.incrementReps ?? def.defaultIncrementReps ?? 1;
          const base = settings.targetReps ?? def.defaultReps ?? 10;
          settings.targetReps = Math.max(1, base - dec);
        } else {
          settings.currentWeight = roundToAchievableWeight(
            settings.currentWeight * (1 - settings.deloadPercent)
          );
        }
        settings.failureCount = 0;
      }
    }

    out[planItem.exerciseId] = settings;
  }

  return out;
}
