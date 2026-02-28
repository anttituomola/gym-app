import type { BiometricsInput, TrainingGoalsInput } from '$lib/types';
import { validateWeight, validateHeight } from './units';

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Biometrics Validation
// ============================================================================

export function validateBiometrics(input: Partial<BiometricsInput>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate sex
  if (!input.sex) {
    errors.push({ field: 'sex', message: 'Please select your sex' });
  } else if (!['male', 'female'].includes(input.sex)) {
    errors.push({ field: 'sex', message: 'Invalid selection' });
  }

  // Validate body weight
  if (input.bodyWeight === undefined || input.bodyWeight === null) {
    errors.push({ field: 'bodyWeight', message: 'Please enter your body weight' });
  } else if (isNaN(input.bodyWeight) || input.bodyWeight <= 0) {
    errors.push({ field: 'bodyWeight', message: 'Please enter a valid weight' });
  } else if (input.bodyWeightUnit) {
    const validation = validateWeight(input.bodyWeight, input.bodyWeightUnit);
    if (!validation.valid) {
      errors.push({ field: 'bodyWeight', message: validation.error! });
    }
  }

  if (!input.bodyWeightUnit) {
    errors.push({ field: 'bodyWeightUnit', message: 'Please select a unit' });
  }

  // Validate height
  if (input.height === undefined || input.height === null) {
    errors.push({ field: 'height', message: 'Please enter your height' });
  } else if (isNaN(input.height) || input.height <= 0) {
    errors.push({ field: 'height', message: 'Please enter a valid height' });
  } else if (input.heightUnit) {
    const validation = validateHeight(input.height, input.heightUnit);
    if (!validation.valid) {
      errors.push({ field: 'height', message: validation.error! });
    }
  }

  if (!input.heightUnit) {
    errors.push({ field: 'heightUnit', message: 'Please select a unit' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single biometric field (for real-time validation)
 */
export function validateBiometricField(
  field: keyof BiometricsInput,
  value: unknown,
  allValues?: Partial<BiometricsInput>
): string | null {
  switch (field) {
    case 'sex':
      if (!value) return 'Please select your sex';
      if (!['male', 'female'].includes(value as string)) return 'Invalid selection';
      return null;

    case 'bodyWeight':
      if (value === undefined || value === null) return 'Please enter your weight';
      if (typeof value !== 'number' || isNaN(value) || value <= 0) {
        return 'Please enter a valid weight';
      }
      if (allValues?.bodyWeightUnit) {
        const validation = validateWeight(value as number, allValues.bodyWeightUnit);
        if (!validation.valid) return validation.error || 'Invalid weight';
      }
      return null;

    case 'bodyWeightUnit':
      if (!value) return 'Please select a unit';
      if (!['kg', 'lbs'].includes(value as string)) return 'Invalid unit';
      return null;

    case 'height':
      if (value === undefined || value === null) return 'Please enter your height';
      if (typeof value !== 'number' || isNaN(value) || value <= 0) {
        return 'Please enter a valid height';
      }
      if (allValues?.heightUnit) {
        const validation = validateHeight(value as number, allValues.heightUnit);
        if (!validation.valid) return validation.error || 'Invalid height';
      }
      return null;

    case 'heightUnit':
      if (!value) return 'Please select a unit';
      if (!['cm', 'inches'].includes(value as string)) return 'Invalid unit';
      return null;

    default:
      return null;
  }
}

// ============================================================================
// Training Goals Validation
// ============================================================================

export function validateTrainingGoals(input: Partial<TrainingGoalsInput>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate primary goal
  if (!input.primaryGoal) {
    errors.push({ field: 'primaryGoal', message: 'Please select your primary goal' });
  } else if (!['strength', 'muscle', 'weight_loss', 'general'].includes(input.primaryGoal)) {
    errors.push({ field: 'primaryGoal', message: 'Invalid selection' });
  }

  // Validate experience level
  if (!input.experienceLevel) {
    errors.push({ field: 'experienceLevel', message: 'Please select your experience level' });
  } else if (!['beginner', 'intermediate', 'advanced'].includes(input.experienceLevel)) {
    errors.push({ field: 'experienceLevel', message: 'Invalid selection' });
  }

  // Validate time per workout
  if (!input.timePerWorkout) {
    errors.push({ field: 'timePerWorkout', message: 'Please select time per workout' });
  } else if (![30, 45, 60, 90].includes(input.timePerWorkout)) {
    errors.push({ field: 'timePerWorkout', message: 'Invalid selection' });
  }

  // Validate workouts per week
  if (!input.workoutsPerWeek) {
    errors.push({ field: 'workoutsPerWeek', message: 'Please select weekly frequency' });
  } else if (![2, 3, 4, 5, 6].includes(input.workoutsPerWeek)) {
    errors.push({ field: 'workoutsPerWeek', message: 'Invalid selection' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single training goal field (for real-time validation)
 */
export function validateTrainingGoalField(
  field: keyof TrainingGoalsInput,
  value: unknown
): string | null {
  switch (field) {
    case 'primaryGoal':
      if (!value) return 'Please select your primary goal';
      if (!['strength', 'muscle', 'weight_loss', 'general'].includes(value as string)) {
        return 'Invalid selection';
      }
      return null;

    case 'experienceLevel':
      if (!value) return 'Please select your experience level';
      if (!['beginner', 'intermediate', 'advanced'].includes(value as string)) {
        return 'Invalid selection';
      }
      return null;

    case 'timePerWorkout':
      if (!value) return 'Please select time per workout';
      if (![30, 45, 60, 90].includes(value as number)) {
        return 'Invalid selection';
      }
      return null;

    case 'workoutsPerWeek':
      if (!value) return 'Please select weekly frequency';
      if (![2, 3, 4, 5, 6].includes(value as number)) {
        return 'Invalid selection';
      }
      return null;

    default:
      return null;
  }
}

// ============================================================================
// Smart Recommendations
// ============================================================================

export interface ScheduleRecommendation {
  timePerWorkout: 30 | 45 | 60 | 90;
  workoutsPerWeek: 2 | 3 | 4 | 5 | 6;
  reasoning: string;
}

export function getSmartRecommendation(
  primaryGoal: TrainingGoalsInput['primaryGoal'],
  experienceLevel: TrainingGoalsInput['experienceLevel']
): ScheduleRecommendation {
  const recommendations: Record<
    TrainingGoalsInput['primaryGoal'],
    Record<TrainingGoalsInput['experienceLevel'], ScheduleRecommendation>
  > = {
    strength: {
      beginner: {
        timePerWorkout: 60,
        workoutsPerWeek: 3,
        reasoning: 'Focus on learning movements with adequate recovery',
      },
      intermediate: {
        timePerWorkout: 90,
        workoutsPerWeek: 4,
        reasoning: 'Higher volume and frequency for strength gains',
      },
      advanced: {
        timePerWorkout: 90,
        workoutsPerWeek: 4,
        reasoning: 'Specialized split with high volume',
      },
    },
    muscle: {
      beginner: {
        timePerWorkout: 60,
        workoutsPerWeek: 4,
        reasoning: 'Moderate frequency allows adequate volume per session',
      },
      intermediate: {
        timePerWorkout: 60,
        workoutsPerWeek: 5,
        reasoning: 'Higher frequency for increased weekly volume',
      },
      advanced: {
        timePerWorkout: 90,
        workoutsPerWeek: 5,
        reasoning: 'High volume split targeting all muscles 2x/week',
      },
    },
    weight_loss: {
      beginner: {
        timePerWorkout: 45,
        workoutsPerWeek: 3,
        reasoning: 'Sustainable starting point with cardio focus',
      },
      intermediate: {
        timePerWorkout: 60,
        workoutsPerWeek: 4,
        reasoning: 'Higher frequency increases calorie burn',
      },
      advanced: {
        timePerWorkout: 60,
        workoutsPerWeek: 5,
        reasoning: 'Maximum calorie expenditure with adequate recovery',
      },
    },
    general: {
      beginner: {
        timePerWorkout: 45,
        workoutsPerWeek: 3,
        reasoning: 'Balanced approach for overall fitness',
      },
      intermediate: {
        timePerWorkout: 60,
        workoutsPerWeek: 4,
        reasoning: 'Varied training for well-rounded fitness',
      },
      advanced: {
        timePerWorkout: 60,
        workoutsPerWeek: 4,
        reasoning: 'Maintain fitness with efficient programming',
      },
    },
  };

  return recommendations[primaryGoal][experienceLevel];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the first error message for a specific field
 */
export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field);
  return error?.message || null;
}

/**
 * Check if a field has an error
 */
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(e => e.field === field);
}

/**
 * Format display value for time per workout
 */
export function formatTimePerWorkout(minutes: number): string {
  const labels: Record<number, string> = {
    30: '30 min (Quick)',
    45: '45 min (Standard)',
    60: '60 min (Full)',
    90: '90 min (Extended)',
  };
  return labels[minutes] || `${minutes} min`;
}

/**
 * Format display value for workouts per week
 */
export function formatWorkoutsPerWeek(days: number): string {
  const labels: Record<number, string> = {
    2: '2 days/week (Minimal)',
    3: '3 days/week (Recommended)',
    4: '4 days/week (Dedicated)',
    5: '5 days/week (Committed)',
    6: '6 days/week (Advanced)',
  };
  return labels[days] || `${days} days/week`;
}

/**
 * Get goal display name
 */
export function getGoalDisplayName(goal: TrainingGoalsInput['primaryGoal']): string {
  const names: Record<TrainingGoalsInput['primaryGoal'], string> = {
    strength: 'Build Strength',
    muscle: 'Build Muscle',
    weight_loss: 'Lose Weight',
    general: 'General Fitness',
  };
  return names[goal];
}

/**
 * Get experience level display name
 */
export function getExperienceDisplayName(level: TrainingGoalsInput['experienceLevel']): string {
  const names: Record<TrainingGoalsInput['experienceLevel'], string> = {
    beginner: 'Beginner (< 6 months)',
    intermediate: 'Intermediate (6 months - 2 years)',
    advanced: 'Advanced (2+ years)',
  };
  return names[level];
}
