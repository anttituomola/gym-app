import { z } from 'zod';
import type { PlannedExercise, WorkoutSet } from './index';

/**
 * AI-related types for workout modification feature
 * All LLM responses are validated using Zod schemas
 */

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * Schema for a planned exercise in LLM response
 * Matches PlannedExercise but with validation
 */
export const PlannedExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(50),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(100),  // Allow 0 for time-based exercises
  weight: z.number().min(0).max(1000),
  timeSeconds: z.number().int().min(1).max(600).optional(),
});

/**
 * Schema for a change made to the workout
 */
export const ChangeSchema = z.object({
  type: z.enum([
    'replace',      // Exercise replaced with another
    'modify_sets',  // Number of sets changed
    'modify_reps',  // Number of reps changed
    'modify_weight', // Weight changed
    'reorder',      // Exercise order changed
    'remove',       // Exercise removed
    'add',          // Exercise added
  ]),
  originalExerciseId: z.string().optional(),
  newExerciseId: z.string().optional(),
  reason: z.string().min(1).max(200),
  details: z.string().max(200).optional(), // Additional context
});

/**
 * Main schema for LLM modification response
 * This is what we expect from the AI
 */
export const ModificationResponseSchema = z.object({
  summary: z.string().min(10).max(500),
  newPlan: z.array(PlannedExerciseSchema).min(1).max(20),
  changes: z.array(ChangeSchema).min(1),
  warnings: z.array(z.string().max(200)).max(5),
});

// Type inference from schemas
export type ValidatedModificationResponse = z.infer<typeof ModificationResponseSchema>;
export type ValidatedChange = z.infer<typeof ChangeSchema>;
export type ValidatedPlannedExercise = z.infer<typeof PlannedExerciseSchema>;

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request sent to AI workout modification service
 */
export interface ModificationRequest {
  /** User's natural language request */
  userRequest: string;
  /** Current workout plan */
  currentPlan: PlannedExercise[];
  /** User's available gym equipment */
  availableEquipment: string[];
  /** User's exercise settings (current weights, etc) */
  userExerciseSettings: Record<string, {
    currentWeight: number;
    weightUnit: 'kg' | 'lbs';
    useBodyweightProgression?: boolean;
    targetReps?: number;
  }>;
  /** Sets already completed in this workout */
  completedSets: WorkoutSet[];
  /** Previous modification requests (for refinement context) */
  previousRequests?: string[];
}

/**
 * Response from AI workout modification service
 * This is after validation and processing
 */
export interface ModificationResponse {
  /** Human-readable summary of changes */
  summary: string;
  /** The new workout plan */
  newPlan: PlannedExercise[];
  /** List of specific changes made */
  changes: ModificationChange[];
  /** Any warnings about the modifications */
  warnings: string[];
  /** Metadata about the generation */
  metadata: {
    generatedAt: number;
    modelUsed: string;
    tokensUsed?: number;
  };
}

/**
 * Individual change to the workout
 */
export interface ModificationChange {
  type: 'replace' | 'modify_sets' | 'modify_reps' | 'modify_weight' | 'reorder' | 'remove' | 'add';
  originalExerciseId?: string;
  newExerciseId?: string;
  reason: string;
  details?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating an LLM response
 */
export type ValidationResult = 
  | { success: true; data: ValidatedModificationResponse }
  | { success: false; error: ValidationError };

/**
 * Validation error details
 */
export interface ValidationError {
  type: 
    | 'parse_error'        // JSON parsing failed
    | 'schema_validation'  // Zod validation failed
    | 'invalid_exercise'   // Exercise ID doesn't exist
    | 'missing_equipment'  // Required equipment not available
    | 'invalid_change'     // Change references non-existent exercise
    | 'incomplete_plan'    // Plan is missing original exercises
    | 'safety_check';      // Failed safety bounds check
  message: string;
  details?: string[];
  rawResponse?: string;
}

/**
 * Safety check failure details
 */
export interface SafetyCheckFailure {
  check: 
    | 'weight_too_high' 
    | 'weight_too_low'
    | 'volume_too_high'
    | 'volume_too_low'
    | 'excessive_changes'
    | 'duplicate_exercises';
  exerciseId?: string;
  expected: string | number;
  actual: string | number;
  message: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * State of the modification modal
 */
export type ModificationModalState = 
  | { type: 'input' }           // User entering request
  | { type: 'loading' }         // Waiting for AI
  | { type: 'review'; response: ModificationResponse }  // Review changes
  | { type: 'refinement'; previousRequest: string; error?: ValidationError }  // Refine request
  | { type: 'error'; error: ValidationError };  // Show error

/**
 * User's AI settings
 */
export interface AiUserSettings {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | null;
  tokenStorage: 'local' | 'encrypted' | null;
  hasTokenConfigured: boolean;
}

/**
 * Quick action preset for common modification requests
 */
export interface QuickActionPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'equipment' | 'injury' | 'intensity' | 'preference';
  buildRequest: (context: QuickActionContext) => string;
}

/**
 * Context passed to quick action builders
 */
export interface QuickActionContext {
  currentPlan: PlannedExercise[];
  availableEquipment: string[];
  selectedBodyParts?: string[];
  selectedEquipment?: string[];
  intensityLevel?: 'easier' | 'harder';
}

// ============================================================================
// LLM Provider Types
// ============================================================================

/**
 * Configuration for LLM provider
 */
export interface LlmConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Raw LLM response before validation
 */
export interface RawLlmResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  finishReason: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that exercise IDs exist in our database
 */
export function validateExerciseIds(
  response: ValidatedModificationResponse,
  validExerciseIds: Set<string>
): { valid: boolean; invalidIds: string[] } {
  const invalidIds: string[] = [];
  
  for (const exercise of response.newPlan) {
    if (!validExerciseIds.has(exercise.exerciseId)) {
      invalidIds.push(exercise.exerciseId);
    }
  }

  for (const change of response.changes) {
    if (change.originalExerciseId && !validExerciseIds.has(change.originalExerciseId)) {
      if (!invalidIds.includes(change.originalExerciseId)) {
        invalidIds.push(change.originalExerciseId);
      }
    }
    if (change.newExerciseId && !validExerciseIds.has(change.newExerciseId)) {
      if (!invalidIds.includes(change.newExerciseId)) {
        invalidIds.push(change.newExerciseId);
      }
    }
  }

  return { valid: invalidIds.length === 0, invalidIds };
}

/**
 * Validate that exercises match available equipment
 */
export function validateEquipment(
  response: ValidatedModificationResponse,
  availableEquipment: string[],
  exerciseEquipmentMap: Map<string, string[]>
): { valid: boolean; violations: { exerciseId: string; missing: string[] }[] } {
  const violations: { exerciseId: string; missing: string[] }[] = [];

  for (const exercise of response.newPlan) {
    const required = exerciseEquipmentMap.get(exercise.exerciseId) || [];
    if (required.length === 0) continue; // Bodyweight exercise

    const hasEquipment = required.some(eq => 
      eq === 'bodyweight' || availableEquipment.includes(eq)
    );

    if (!hasEquipment) {
      violations.push({
        exerciseId: exercise.exerciseId,
        missing: required,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Run safety checks on the proposed plan
 */
export function runSafetyChecks(
  response: ValidatedModificationResponse,
  originalPlan: PlannedExercise[]
): { passed: boolean; failures: SafetyCheckFailure[] } {
  const failures: SafetyCheckFailure[] = [];

  // Check for duplicate exercises
  const exerciseIds = response.newPlan.map(e => e.exerciseId);
  const duplicates = exerciseIds.filter((item, index) => exerciseIds.indexOf(item) !== index);
  if (duplicates.length > 0) {
    failures.push({
      check: 'duplicate_exercises',
      expected: 'unique exercises',
      actual: `duplicates: ${duplicates.join(', ')}`,
      message: 'Plan contains duplicate exercises',
    });
  }

  // Check individual exercise parameters
  for (const exercise of response.newPlan) {
    // Weight bounds check
    if (exercise.weight > 600) {
      failures.push({
        check: 'weight_too_high',
        exerciseId: exercise.exerciseId,
        expected: '< 600kg',
        actual: `${exercise.weight}kg`,
        message: `${exercise.exerciseId} weight seems unusually high`,
      });
    }

    // Reasonable sets/reps check
    const totalVolume = exercise.sets * exercise.reps;
    if (totalVolume > 200) {
      failures.push({
        check: 'volume_too_high',
        exerciseId: exercise.exerciseId,
        expected: '< 200 total reps',
        actual: `${totalVolume} reps (${exercise.sets}x${exercise.reps})`,
        message: `${exercise.exerciseId} volume seems unusually high`,
      });
    }
  }

  // Check for excessive changes
  if (response.changes.length > 10) {
    failures.push({
      check: 'excessive_changes',
      expected: '< 10 changes',
      actual: `${response.changes.length} changes`,
      message: 'Too many modifications - consider a simpler request',
    });
  }

  return { passed: failures.length === 0, failures };
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Create a user-friendly error message from validation error
 */
export function formatValidationError(error: ValidationError): string {
  switch (error.type) {
    case 'parse_error':
      return "I couldn't understand the AI's response. Please try again.";
    
    case 'schema_validation':
      return `The response format was invalid: ${error.details?.join(', ') || 'Unknown error'}`;
    
    case 'invalid_exercise':
      return `Unknown exercise in response: ${error.details?.join(', ')}. Using fallback options.`;
    
    case 'missing_equipment':
      return `Some suggested exercises require equipment you don't have: ${error.details?.join(', ')}`;
    
    case 'invalid_change':
      return "The proposed changes don't match the current workout. Please try a different request.";
    
    case 'incomplete_plan':
      return `The AI returned an incomplete workout plan: ${error.message}. Please try again.`;
    
    case 'safety_check':
      return `Safety check failed: ${error.message}. Please review the suggestions.`;
    
    default:
      return 'Something went wrong. Please try again or use the manual options.';
  }
}
