import type { QuickActionPreset, QuickActionContext } from '$lib/types/ai';
import { getExerciseById } from './exercises';

/**
 * Quick Action Presets for common workout modification requests
 * These provide one-tap options that generate natural language requests
 */

export const MODIFICATION_PRESETS: QuickActionPreset[] = [
  // Equipment Issues
  {
    id: 'equipment-taken',
    label: 'Equipment Taken',
    description: 'Some equipment is unavailable',
    icon: '🚫',
    category: 'equipment',
    buildRequest: (context) => {
      return `Some equipment I need is currently taken or unavailable. Please suggest alternatives using only: ${context.availableEquipment.join(', ')}.`;
    },
  },
  {
    id: 'no-barbell',
    label: 'No Barbell',
    description: 'Barbell exercises not possible today',
    icon: '🏋️',
    category: 'equipment',
    buildRequest: () => {
      return "I don't have access to a barbell today. Please replace all barbell exercises with dumbbell or bodyweight alternatives.";
    },
  },
  {
    id: 'dumbbells-only',
    label: 'Dumbbells Only',
    description: 'Only have dumbbells available',
    icon: '🔩',
    category: 'equipment',
    buildRequest: () => {
      return "I only have dumbbells available today. Please modify the workout to use only dumbbell exercises.";
    },
  },
  {
    id: 'cables-taken',
    label: 'Cables/Machines Taken',
    description: 'Cable machines are occupied',
    icon: '🔗',
    category: 'equipment',
    buildRequest: () => {
      return "Cable machines and weight machines are all taken. Please give me a workout using only free weights or bodyweight exercises.";
    },
  },

  // Injury/Pain Management
  {
    id: 'shoulder-pain',
    label: 'Shoulder Pain',
    description: 'Need shoulder-friendly alternatives',
    icon: '🤕',
    category: 'injury',
    buildRequest: () => {
      return "My shoulder is bothering me today. Please modify pressing movements to be more shoulder-friendly, and reduce or remove any overhead work.";
    },
  },
  {
    id: 'lower-back-pain',
    label: 'Lower Back Pain',
    description: 'Need lower back-friendly options',
    icon: '🏥',
    category: 'injury',
    buildRequest: () => {
      return "I'm experiencing some lower back discomfort. Please replace exercises that load the spine with machine-based or supported alternatives.";
    },
  },
  {
    id: 'knee-pain',
    label: 'Knee Pain',
    description: 'Need knee-friendly leg exercises',
    icon: '🦵',
    category: 'injury',
    buildRequest: () => {
      return "My knee is acting up today. Please modify leg exercises to reduce knee stress - focus on hip hinge movements or machine-based leg work.";
    },
  },
  {
    id: 'wrist-pain',
    label: 'Wrist Pain',
    description: 'Need wrist-friendly grip options',
    icon: '✋',
    category: 'injury',
    buildRequest: () => {
      return "My wrist is painful today. Please suggest exercises that don't require direct wrist loading, or use neutral grip positions.";
    },
  },

  // Intensity Adjustments
  {
    id: 'feeling-tired',
    label: 'Feeling Tired',
    description: 'Reduce intensity today',
    icon: '😴',
    category: 'intensity',
    buildRequest: () => {
      return "I'm feeling tired and low on energy today. Please reduce the workout volume or intensity while keeping the same exercise selection.";
    },
  },
  {
    id: 'deload-day',
    label: 'Deload Day',
    description: 'Significantly lighter workout',
    icon: '🪶',
    category: 'intensity',
    buildRequest: () => {
      return "This is a deload day. Please reduce all weights by about 20-30% and cut the volume in half. Keep the same exercises.";
    },
  },
  {
    id: 'short-on-time',
    label: 'Short on Time',
    description: 'Quick workout under 30 min',
    icon: '⏱️',
    category: 'intensity',
    buildRequest: () => {
      return "I'm short on time today. Please condense this into a 20-30 minute workout by reducing sets and focusing on the most important exercises.";
    },
  },
  {
    id: 'feeling-strong',
    label: 'Feeling Strong',
    description: 'Make it harder',
    icon: '💪',
    category: 'intensity',
    buildRequest: () => {
      return "I'm feeling great today and want to push harder. Please increase the intensity - add sets, reduce rest, or suggest more challenging variations.";
    },
  },

  // Preference/Variation
  {
    id: 'want-variation',
    label: 'Want Variation',
    description: 'Try different exercises',
    icon: '🔄',
    category: 'preference',
    buildRequest: (context) => {
      const exerciseNames = context.currentPlan.map(e => getExerciseById(e.exerciseId)?.name || e.exerciseId).join(', ');
      return `I want to try some different exercises today instead of: ${exerciseNames}. Please suggest alternative exercises that work the same muscle groups.`;
    },
  },
  {
    id: 'focus-upper',
    label: 'Focus Upper Body',
    description: 'More upper, less lower',
    icon: '👆',
    category: 'preference',
    buildRequest: () => {
      return "I want to focus more on upper body today. Please reduce or remove leg exercises and add more pressing, pulling, or arm work.";
    },
  },
  {
    id: 'focus-lower',
    label: 'Focus Lower Body',
    description: 'More lower, less upper',
    icon: '👇',
    category: 'preference',
    buildRequest: () => {
      return "I want to focus more on lower body today. Please reduce upper body work and add more leg and posterior chain exercises.";
    },
  },
  {
    id: 'add-isolation',
    label: 'Add Isolation Work',
    description: 'More accessory exercises',
    icon: '🎯',
    category: 'preference',
    buildRequest: () => {
      return "I'd like to add some isolation work today for arms, shoulders, or calves. Please keep the main lifts but add 1-2 isolation exercises at the end.";
    },
  },
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: QuickActionPreset['category']): QuickActionPreset[] {
  return MODIFICATION_PRESETS.filter(preset => preset.category === category);
}

/**
 * Get all unique categories
 */
export const PRESET_CATEGORIES: { id: QuickActionPreset['category']; label: string; icon: string }[] = [
  { id: 'equipment', label: 'Equipment', icon: '🏋️' },
  { id: 'injury', label: 'Injury/Pain', icon: '🤕' },
  { id: 'intensity', label: 'Intensity', icon: '⚡' },
  { id: 'preference', label: 'Preference', icon: '⚙️' },
];

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): QuickActionPreset | undefined {
  return MODIFICATION_PRESETS.find(preset => preset.id === id);
}

/**
 * Body part options for injury-related modifications
 */
export const INJURY_BODY_PARTS = [
  { id: 'shoulder', label: 'Shoulder', icon: '🦴' },
  { id: 'lower-back', label: 'Lower Back', icon: '🏥' },
  { id: 'knee', label: 'Knee', icon: '🦵' },
  { id: 'wrist', label: 'Wrist', icon: '✋' },
  { id: 'elbow', label: 'Elbow', icon: '💪' },
  { id: 'hip', label: 'Hip', icon: '🍑' },
  { id: 'ankle', label: 'Ankle', icon: '🦶' },
] as const;

/**
 * Equipment options for equipment-related modifications
 */
export const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Barbell', icon: '🏋️' },
  { id: 'squat-rack', label: 'Squat Rack', icon: '📦' },
  { id: 'bench', label: 'Bench', icon: '🪑' },
  { id: 'dumbbells', label: 'Dumbbells', icon: '🔩' },
  { id: 'cable-machine', label: 'Cable Machine', icon: '🔗' },
  { id: 'leg-press', label: 'Leg Press', icon: '🦵' },
  { id: 'pull-up-bar', label: 'Pull-up Bar', icon: '🪜' },
  { id: 'kettlebells', label: 'Kettlebells', icon: '☕' },
] as const;

/**
 * Build a custom request from selected options
 */
export function buildCustomRequest(
  type: 'equipment' | 'injury' | 'intensity' | 'preference',
  selectedOptions: string[],
  context: QuickActionContext
): string {
  switch (type) {
    case 'equipment': {
      const unavailable = selectedOptions.join(', ');
      return `The following equipment is unavailable: ${unavailable}. Please modify the workout to use only: ${context.availableEquipment.filter(e => !selectedOptions.includes(e)).join(', ') || 'bodyweight exercises'}.`;
    }
    
    case 'injury': {
      const bodyParts = selectedOptions.join(', ');
      return `I'm experiencing pain in my ${bodyParts}. Please suggest exercises that are gentle on these areas while still giving me a good workout.`;
    }
    
    case 'intensity': {
      const level = selectedOptions[0];
      if (level === 'easier') {
        return "I'm not feeling my best today. Please make this workout easier - reduce volume, weights, or suggest simpler variations.";
      } else {
        return "I'm feeling great today! Please make this workout more challenging - add volume, increase weights, or suggest harder variations.";
      }
    }
    
    default:
      return "Please modify my workout.";
  }
}
