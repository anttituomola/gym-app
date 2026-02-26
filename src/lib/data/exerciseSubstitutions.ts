import { EXERCISES, getExerciseById } from './exercises';
import type { Exercise } from '$lib/types';

/**
 * Substitution rules for exercises when equipment is unavailable
 * or user needs alternatives due to injury, preference, etc.
 */

export type SubstitutionReason = 
  | 'equipment'      // Equipment unavailable
  | 'easier'         // Need easier variation
  | 'harder'         // Need harder variation
  | 'injury_friendly' // Easier on specific body parts
  | 'preference';    // User preference

export interface SubstitutionAlternative {
  exerciseId: string;
  reason: SubstitutionReason;
  requiredEquipment: string[];
  affectedBodyParts: string[];  // Body parts this is good for (esp. for injuries)
  intensityChange: 'lower' | 'similar' | 'higher';
  description: string;  // Why this substitution makes sense
}

export interface SubstitutionRule {
  exerciseId: string;
  alternatives: SubstitutionAlternative[];
}

// Body parts that can be affected by exercises/injuries
export const BODY_PARTS = [
  'shoulder',
  'knee',
  'lower-back',
  'wrist',
  'elbow',
  'hip',
  'ankle',
] as const;

export type BodyPart = typeof BODY_PARTS[number];

/**
 * Hard-coded substitution rules
 * Each exercise has alternatives for different scenarios
 */
export const SUBSTITUTION_RULES: SubstitutionRule[] = [
  // SQUAT variations
  {
    exerciseId: 'squat',
    alternatives: [
      {
        exerciseId: 'leg-press',
        reason: 'equipment',
        requiredEquipment: ['leg-press'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'Machine-based leg press, easier on lower back',
      },
      {
        exerciseId: 'goblet-squat',
        reason: 'equipment',
        requiredEquipment: ['dumbbells'],
        affectedBodyParts: ['lower-back', 'shoulder'],
        intensityChange: 'lower',
        description: 'Lighter load, easier to learn, good for technique work',
      },
      {
        exerciseId: 'lunge',
        reason: 'easier',
        requiredEquipment: ['dumbbells'],
        affectedBodyParts: [],
        intensityChange: 'lower',
        description: 'Unilateral leg work, lighter load per leg',
      },
      {
        exerciseId: 'lunge',
        reason: 'injury_friendly',
        requiredEquipment: ['dumbbells'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'Less spinal loading than barbell squat',
      },
    ],
  },

  // BENCH PRESS variations
  {
    exerciseId: 'bench-press',
    alternatives: [
      {
        exerciseId: 'dumbbell-press',
        reason: 'equipment',
        requiredEquipment: ['dumbbells', 'bench'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'similar',
        description: 'Greater range of motion, independent arm movement',
      },
      {
        exerciseId: 'incline-bench-press',
        reason: 'injury_friendly',
        requiredEquipment: ['barbell', 'bench'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'lower',
        description: 'Less shoulder stress due to angle',
      },
      {
        exerciseId: 'dumbbell-press',
        reason: 'injury_friendly',
        requiredEquipment: ['dumbbells', 'bench'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'lower',
        description: 'More natural shoulder movement, less strain',
      },
      {
        exerciseId: 'dip',
        reason: 'harder',
        requiredEquipment: ['dip-bars'],
        affectedBodyParts: [],
        intensityChange: 'higher',
        description: 'Bodyweight exercise, can add weight for progression',
      },
      {
        exerciseId: 'push-up',
        reason: 'easier',
        requiredEquipment: [],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'lower',
        description: 'Bodyweight only, scalable difficulty',
      },
    ],
  },

  // OVERHEAD PRESS variations
  {
    exerciseId: 'overhead-press',
    alternatives: [
      {
        exerciseId: 'dumbbell-press',
        reason: 'equipment',
        requiredEquipment: ['dumbbells', 'bench'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Seated dumbbell press as alternative',
      },
      {
        exerciseId: 'dumbbell-press',
        reason: 'injury_friendly',
        requiredEquipment: ['dumbbells', 'bench'],
        affectedBodyParts: ['shoulder', 'wrist'],
        intensityChange: 'lower',
        description: 'More neutral grip options, less wrist strain',
      },
      {
        exerciseId: 'dip',
        reason: 'equipment',
        requiredEquipment: ['dip-bars'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'similar',
        description: 'Good shoulder/triceps alternative',
      },
      {
        exerciseId: 'push-up',
        reason: 'easier',
        requiredEquipment: [],
        affectedBodyParts: [],
        intensityChange: 'lower',
        description: 'Pike push-ups or standard push-ups',
      },
    ],
  },

  // DIP variations (for when dips need to be replaced)
  {
    exerciseId: 'dip',
    alternatives: [
      {
        exerciseId: 'push-up',
        reason: 'injury_friendly',
        requiredEquipment: [],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'lower',
        description: 'Less shoulder stress, more control over range of motion',
      },
      {
        exerciseId: 'bench-press',
        reason: 'injury_friendly',
        requiredEquipment: ['barbell', 'bench'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'similar',
        description: 'Flat bench is generally easier on shoulders than dips',
      },
      {
        exerciseId: 'dumbbell-press',
        reason: 'injury_friendly',
        requiredEquipment: ['dumbbells', 'bench'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'similar',
        description: 'Neutral grip option reduces shoulder strain',
      },
      {
        exerciseId: 'incline-bench-press',
        reason: 'injury_friendly',
        requiredEquipment: ['barbell', 'bench'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'similar',
        description: 'Incline angle is often more shoulder-friendly',
      },
    ],
  },

  // BARBELL ROW variations
  {
    exerciseId: 'barbell-row',
    alternatives: [
      {
        exerciseId: 'dumbbell-row',
        reason: 'equipment',
        requiredEquipment: ['dumbbells'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'One-arm row, more back focus, less lower back strain',
      },
      {
        exerciseId: 'lat-pulldown',
        reason: 'equipment',
        requiredEquipment: ['cable-machine'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'Machine-based vertical pull',
      },
      {
        exerciseId: 'seated-row',
        reason: 'equipment',
        requiredEquipment: ['cable-machine'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'Machine-based horizontal pull, back supported',
      },
      {
        exerciseId: 'pull-up',
        reason: 'harder',
        requiredEquipment: ['pull-up-bar'],
        affectedBodyParts: [],
        intensityChange: 'higher',
        description: 'Bodyweight vertical pull, very effective',
      },
      {
        exerciseId: 'seated-row',
        reason: 'injury_friendly',
        requiredEquipment: ['cable-machine'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'Seated with chest support, minimal lower back stress',
      },
    ],
  },

  // DEADLIFT variations
  {
    exerciseId: 'deadlift',
    alternatives: [
      {
        exerciseId: 'sumo-deadlift',
        reason: 'injury_friendly',
        requiredEquipment: ['barbell'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'similar',
        description: 'More leg drive, less lower back stress',
      },
      {
        exerciseId: 'romaninan-deadlift',
        reason: 'easier',
        requiredEquipment: ['barbell'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'lower',
        description: 'Lighter weight, focuses on hamstring stretch',
      },
      {
        exerciseId: 'kettlebell-swing',
        reason: 'easier',
        requiredEquipment: ['kettlebells'],
        affectedBodyParts: ['lower-back'],
        intensityChange: 'lower',
        description: 'Dynamic movement, lighter loads, posterior chain focus',
      },
      {
        exerciseId: 'leg-press',
        reason: 'injury_friendly',
        requiredEquipment: ['leg-press'],
        affectedBodyParts: ['lower-back', 'hip'],
        intensityChange: 'lower',
        description: 'Machine-based, removes spinal loading entirely',
      },
      {
        exerciseId: 'sumo-deadlift',
        reason: 'preference',
        requiredEquipment: ['barbell'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Alternative stance, different muscle emphasis',
      },
    ],
  },

  // PULL-UP variations
  {
    exerciseId: 'pull-up',
    alternatives: [
      {
        exerciseId: 'lat-pulldown',
        reason: 'equipment',
        requiredEquipment: ['cable-machine'],
        affectedBodyParts: [],
        intensityChange: 'lower',
        description: 'Machine-assisted version, adjustable weight',
      },
      {
        exerciseId: 'barbell-row',
        reason: 'equipment',
        requiredEquipment: ['barbell'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Horizontal pull instead of vertical',
      },
      {
        exerciseId: 'seated-row',
        reason: 'easier',
        requiredEquipment: ['cable-machine'],
        affectedBodyParts: ['shoulder'],
        intensityChange: 'lower',
        description: 'Supported position, easier on shoulders',
      },
    ],
  },

  // DUMBBELL PRESS variations (if it becomes unavailable)
  {
    exerciseId: 'dumbbell-press',
    alternatives: [
      {
        exerciseId: 'bench-press',
        reason: 'equipment',
        requiredEquipment: ['barbell', 'bench'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Standard barbell alternative',
      },
      {
        exerciseId: 'push-up',
        reason: 'equipment',
        requiredEquipment: [],
        affectedBodyParts: [],
        intensityChange: 'lower',
        description: 'Bodyweight option when no equipment available',
      },
    ],
  },

  // LEG PRESS variations
  {
    exerciseId: 'leg-press',
    alternatives: [
      {
        exerciseId: 'squat',
        reason: 'equipment',
        requiredEquipment: ['barbell', 'squat-rack'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Free weight compound movement',
      },
      {
        exerciseId: 'goblet-squat',
        reason: 'equipment',
        requiredEquipment: ['dumbbells'],
        affectedBodyParts: [],
        intensityChange: 'lower',
        description: 'Dumbbell squat variation',
      },
      {
        exerciseId: 'lunge',
        reason: 'equipment',
        requiredEquipment: ['dumbbells'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Unilateral leg work',
      },
    ],
  },

  // GOBLET SQUAT variations
  {
    exerciseId: 'goblet-squat',
    alternatives: [
      {
        exerciseId: 'squat',
        reason: 'harder',
        requiredEquipment: ['barbell', 'squat-rack'],
        affectedBodyParts: [],
        intensityChange: 'higher',
        description: 'Move to heavier barbell squat',
      },
      {
        exerciseId: 'leg-press',
        reason: 'equipment',
        requiredEquipment: ['leg-press'],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Machine-based alternative',
      },
    ],
  },

  // PLANK variations
  {
    exerciseId: 'plank',
    alternatives: [
      {
        exerciseId: 'side-plank',
        reason: 'preference',
        requiredEquipment: [],
        affectedBodyParts: [],
        intensityChange: 'similar',
        description: 'Oblique focus variation',
      },
      {
        exerciseId: 'hanging-knee-raise',
        reason: 'harder',
        requiredEquipment: ['pull-up-bar'],
        affectedBodyParts: [],
        intensityChange: 'higher',
        description: 'Dynamic ab exercise',
      },
    ],
  },
];

/**
 * Get substitution rule for a specific exercise
 */
export function getSubstitutionRule(exerciseId: string): SubstitutionRule | undefined {
  return SUBSTITUTION_RULES.find(rule => rule.exerciseId === exerciseId);
}

/**
 * Get valid substitutions for an exercise based on user's available equipment
 */
export function getSubstitutionsForExercise(
  exerciseId: string,
  availableEquipment: string[],
  reason?: SubstitutionReason,
  injuredBodyParts?: BodyPart[]
): SubstitutionAlternative[] {
  const rule = getSubstitutionRule(exerciseId);
  if (!rule) return [];

  return rule.alternatives.filter(alt => {
    // Check equipment availability
    const hasEquipment = alt.requiredEquipment.length === 0 || 
      alt.requiredEquipment.some(eq => availableEquipment.includes(eq));
    
    if (!hasEquipment) return false;

    // Filter by reason if specified
    if (reason && alt.reason !== reason) {
      // For 'injury_friendly', also consider alternatives that help with affected body parts
      if (reason === 'injury_friendly' && injuredBodyParts) {
        const helpsInjury = alt.affectedBodyParts.some(bp => injuredBodyParts.includes(bp as BodyPart));
        if (!helpsInjury) return false;
      } else {
        return false;
      }
    }

    // For injury filtering, check if alternative is good for injured parts
    if (injuredBodyParts && injuredBodyParts.length > 0) {
      // If we have specific body parts injured, prioritize alternatives that help
      // But don't exclude everything - user might still want the exercise
      // This is just for recommendation ranking
    }

    return true;
  });
}

/**
 * Get all exercises that can be done with given equipment
 */
export function getExercisesByEquipment(equipment: string[]): Exercise[] {
  return EXERCISES.filter(exercise => 
    exercise.equipment.length === 0 || // Bodyweight exercises
    exercise.equipment.some(eq => equipment.includes(eq))
  );
}

/**
 * Validate if a substitution is valid for the user
 */
export function validateSubstitution(
  fromExerciseId: string,
  toExerciseId: string,
  availableEquipment: string[]
): { valid: boolean; reason?: string } {
  const rule = getSubstitutionRule(fromExerciseId);
  if (!rule) {
    return { valid: false, reason: `No substitution rules found for ${fromExerciseId}` };
  }

  const alternative = rule.alternatives.find(alt => alt.exerciseId === toExerciseId);
  if (!alternative) {
    return { 
      valid: false, 
      reason: `${toExerciseId} is not a valid substitution for ${fromExerciseId}` 
    };
  }

  const hasEquipment = alternative.requiredEquipment.length === 0 ||
    alternative.requiredEquipment.some(eq => availableEquipment.includes(eq));
  
  if (!hasEquipment) {
    const missing = alternative.requiredEquipment.filter(eq => !availableEquipment.includes(eq));
    return { 
      valid: false, 
      reason: `Missing required equipment: ${missing.join(', ')}` 
    };
  }

  // Check that target exercise exists
  const targetExercise = getExerciseById(toExerciseId);
  if (!targetExercise) {
    return { valid: false, reason: `Exercise ${toExerciseId} not found in database` };
  }

  return { valid: true };
}

/**
 * Get recommended starting weight for a substitution
 * Based on user's current weight for the original exercise
 */
export function getSuggestedWeightForSubstitution(
  fromExerciseId: string,
  toExerciseId: string,
  fromWeight: number
): number {
  // Mapping of exercise intensity ratios
  // These are approximate - individual variation will be significant
  const intensityRatios: Record<string, Record<string, number>> = {
    'squat': {
      'leg-press': 1.5,      // Leg press can be loaded heavier
      'goblet-squat': 0.4,   // Goblet squat limited by grip
      'lunge': 0.5,          // Per-leg weight roughly half
    },
    'bench-press': {
      'dumbbell-press': 0.45, // Each dumbbell is ~45% of barbell
      'incline-bench-press': 0.8, // Incline is typically harder
      'dip': 0,              // Bodyweight-based, use bodyweight calculation
      'push-up': 0,          // Bodyweight
    },
    'overhead-press': {
      'dumbbell-press': 0.45,
      'dip': 0,
      'push-up': 0,
    },
    'barbell-row': {
      'dumbbell-row': 0.5,
      'lat-pulldown': 0.9,
      'seated-row': 0.9,
      'pull-up': 0,
    },
    'deadlift': {
      'sumo-deadlift': 0.9,
      'romaninan-deadlift': 0.6,
      'kettlebell-swing': 0.3,
      'leg-press': 1.3,
    },
    'pull-up': {
      'lat-pulldown': 1.0,   // Will need to set based on assistance
      'barbell-row': 0.9,
      'seated-row': 0.9,
    },
  };

  const ratio = intensityRatios[fromExerciseId]?.[toExerciseId];
  
  if (ratio === undefined) {
    // No specific ratio, suggest trying with moderate weight
    return 0;
  }
  
  if (ratio === 0) {
    // Bodyweight exercise - return 0 to signal special handling needed
    return 0;
  }

  return Math.round(fromWeight * ratio * 4) / 4; // Round to nearest 0.25kg
}

/**
 * Get a human-readable description of available substitution options
 * Useful for UI display
 */
export function getSubstitutionOptionsDescription(
  exerciseId: string,
  availableEquipment: string[]
): { category: string; options: { id: string; name: string; description: string }[] }[] {
  const rule = getSubstitutionRule(exerciseId);
  if (!rule) return [];

  const byReason: Record<SubstitutionReason, SubstitutionAlternative[]> = {
    equipment: [],
    easier: [],
    harder: [],
    injury_friendly: [],
    preference: [],
  };

  for (const alt of rule.alternatives) {
    const hasEquipment = alt.requiredEquipment.length === 0 ||
      alt.requiredEquipment.some(eq => availableEquipment.includes(eq));
    
    if (hasEquipment) {
      byReason[alt.reason].push(alt);
    }
  }

  const categories: { category: string; options: { id: string; name: string; description: string }[] }[] = [];

  if (byReason.equipment.length > 0) {
    categories.push({
      category: 'Equipment Alternatives',
      options: byReason.equipment.map(alt => {
        const ex = getExerciseById(alt.exerciseId);
        return {
          id: alt.exerciseId,
          name: ex?.name || alt.exerciseId,
          description: alt.description,
        };
      }),
    });
  }

  if (byReason.injury_friendly.length > 0) {
    categories.push({
      category: 'Injury-Friendly Options',
      options: byReason.injury_friendly.map(alt => {
        const ex = getExerciseById(alt.exerciseId);
        return {
          id: alt.exerciseId,
          name: ex?.name || alt.exerciseId,
          description: alt.description,
        };
      }),
    });
  }

  if (byReason.easier.length > 0) {
    categories.push({
      category: 'Easier Variations',
      options: byReason.easier.map(alt => {
        const ex = getExerciseById(alt.exerciseId);
        return {
          id: alt.exerciseId,
          name: ex?.name || alt.exerciseId,
          description: alt.description,
        };
      }),
    });
  }

  if (byReason.harder.length > 0) {
    categories.push({
      category: 'Harder Variations',
      options: byReason.harder.map(alt => {
        const ex = getExerciseById(alt.exerciseId);
        return {
          id: alt.exerciseId,
          name: ex?.name || alt.exerciseId,
          description: alt.description,
        };
      }),
    });
  }

  return categories;
}
