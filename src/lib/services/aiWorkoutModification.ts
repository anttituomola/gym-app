import { z } from 'zod';
import { EXERCISES, getExerciseById } from '$lib/data/exercises';
import { getSubstitutionsForExercise } from '$lib/data/exerciseSubstitutions';
import type { 
  ModificationRequest, 
  ModificationResponse, 
  RawLlmResponse,
  LlmConfig,
  ValidationResult,
  ValidationError,
  ValidatedModificationResponse,
} from '$lib/types/ai';
import { 
  ModificationResponseSchema,
  validateExerciseIds,
  validateEquipment,
  runSafetyChecks,
  formatValidationError,
} from '$lib/types/ai';
import type { PlannedExercise } from '$lib/types';

/**
 * AI Workout Modification Service
 * 
 * Handles communication with LLM providers (OpenAI/Anthropic) to generate
 * workout modifications based on user requests. All responses are validated
 * using Zod schemas for type safety and data integrity.
 */

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_TOKENS = 1500;
const DEFAULT_TEMPERATURE = 0.3; // Lower temperature for more deterministic responses

const VALID_EXERCISE_IDS = new Set(EXERCISES.map(e => e.id));
const EXERCISE_EQUIPMENT_MAP = new Map(EXERCISES.map(e => [e.id, e.equipment]));

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Generate a workout modification using AI
 * 
 * @param request - The modification request with user context
 * @param config - LLM provider configuration (API key, provider, etc)
 * @returns Validated modification response or error
 */
export async function generateWorkoutModification(
  request: ModificationRequest,
  config: LlmConfig
): Promise<ModificationResponse> {
  
  // Build the prompt
  const prompt = buildModificationPrompt(request);
  
  // Call the LLM
  let rawResponse: RawLlmResponse;
  try {
    rawResponse = await callLlm(prompt, config);
  } catch (error) {
    throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Parse and validate the response
  const validation = parseAndValidateResponse(
    rawResponse,
    request,
    VALID_EXERCISE_IDS,
    request.availableEquipment,
    EXERCISE_EQUIPMENT_MAP
  );
  
  if (!validation.success) {
    throw new Error(formatValidationError(validation.error));
  }
  
  // Convert validated response to our internal format
  return convertToModificationResponse(
    validation.data,
    rawResponse,
    request
  );
}

/**
 * Try to generate a modification with fallback handling
 * If primary attempt fails, tries to use hard-coded substitutions
 */
export async function generateWorkoutModificationWithFallback(
  request: ModificationRequest,
  config: LlmConfig
): Promise<{ 
  success: true; 
  response: ModificationResponse;
  usedFallback: boolean;
} | { 
  success: false; 
  error: string;
  fallbackOptions?: FallbackOption[];
}> {
  
  try {
    const response = await generateWorkoutModification(request, config);
    return { success: true, response, usedFallback: false };
  } catch (error) {
    // Generate fallback options based on hard-coded rules
    const fallbackOptions = generateFallbackOptions(request);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallbackOptions: fallbackOptions.length > 0 ? fallbackOptions : undefined,
    };
  }
}

// ============================================================================
// Prompt Engineering
// ============================================================================

/**
 * Build the prompt for the LLM
 */
function buildModificationPrompt(request: ModificationRequest): string {
  const { 
    userRequest, 
    currentPlan, 
    availableEquipment, 
    userExerciseSettings,
    completedSets,
    previousRequests = [],
  } = request;

  // Build exercise list with details
  const exerciseDetails = currentPlan.map(ex => {
    const exercise = getExerciseById(ex.exerciseId);
    const settings = userExerciseSettings[ex.exerciseId];
    return {
      id: ex.exerciseId,
      name: exercise?.name || ex.exerciseId,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      timeSeconds: ex.timeSeconds,
      equipment: exercise?.equipment || [],
      currentMaxWeight: settings?.currentWeight,
    };
  });

  // Find completed exercises to preserve
  const completedDetails = completedSets.map(s => ({
    exerciseId: s.exerciseId,
    setNumber: s.setNumber,
    type: s.type,
    completedReps: s.completedReps,
    failed: s.failed,
  }));

  // Build available exercises list
  console.log('Building available exercises for equipment:', availableEquipment);
  const availableExercises = EXERCISES
    .filter(ex => {
      const hasEquipment = ex.equipment.length === 0 || 
        ex.equipment.some(eq => availableEquipment.includes(eq));
      if (!hasEquipment) {
        console.log('Filtering out:', ex.id, 'needs:', ex.equipment);
      }
      return hasEquipment;
    })
    .map(ex => ({
      id: ex.id,
      name: ex.name,
      equipment: ex.equipment,
      category: ex.category,
    }));
  console.log('Available exercises:', availableExercises.map(e => e.id));

  const prompt = `You are an expert fitness trainer helping modify a single workout session.

## CURRENT WORKOUT PLAN (ALL of these must be in your response)
${exerciseDetails.map((ex, i) => `${i + 1}. ${ex.name} (${ex.id}): ${ex.sets} sets × ${ex.reps} reps @ ${ex.weight}kg${ex.timeSeconds ? `, ${ex.timeSeconds}s hold` : ''}`).join('\n')}

## EXERCISES THAT MUST BE IN NEWPLAN (unless user asks to remove)
${exerciseDetails.map(ex => `- ${ex.id}`).join('\n')}

## USER'S AVAILABLE EQUIPMENT
${availableEquipment.join(', ') || 'None (bodyweight only)'}

## COMPLETED SETS (DO NOT MODIFY THESE)
${completedDetails.length > 0 
  ? completedDetails.map(s => `- ${s.exerciseId}: ${s.type} set ${s.setNumber}${s.completedReps !== undefined ? ` (${s.completedReps} reps${s.failed ? ', failed' : ''})` : ''}`).join('\n')
  : 'None yet'
}

## AVAILABLE EXERCISES FOR SUBSTITUTION
${availableExercises.map(ex => `- ${ex.id}: ${ex.name} (${ex.category}, needs: ${ex.equipment.join(', ') || 'none'})`).join('\n')}

## BODY PART CONSIDERATIONS (for injury/pain requests)
- Shoulder issues: Avoid or modify - dip, overhead-press, incline-bench-press
- Lower back issues: Avoid or modify - squat, deadlift, barbell-row, romanian-deadlift
- Knee issues: Avoid or modify - squat, lunge, leg-press
- Wrist issues: Avoid or modify - bench-press, overhead-press, barbell-row, barbell-curl

${previousRequests.length > 0 ? `## PREVIOUS REQUESTS IN THIS CONVERSATION
${previousRequests.map((r, i) => `${i + 1}. ${r}`).join('\n')}` : ''}

## USER'S REQUEST
"${userRequest}"

## YOUR TASK
1. Analyze the user's request and current workout
2. Identify if user mentions injuries or body parts to avoid (shoulder, knee, lower-back, etc.)
3. Create a COMPLETE modified workout plan with ALL exercises (both modified and unmodified)
4. IMPORTANT: For injury/pain requests, identify ALL exercises that stress the affected body part and replace them
5. IMPORTANT: Return the FULL plan including ALL exercises, even those that don't need changes
6. IMPORTANT: Do NOT remove exercises unless the user explicitly asks you to
7. IMPORTANT: Preserve all completed sets - only modify exercises that haven't been started
8. Only use exercises from the AVAILABLE EXERCISES list
9. Ensure all required equipment is in AVAILABLE EQUIPMENT

## CRITICAL RULES
1. You MUST return the COMPLETE workout plan in "newPlan", including:
   - Exercises that were modified/replaced
   - Exercises that stay the same (unchanged)
   - ALL exercises from the original workout (unless explicitly removed by user request)

2. When REPLACING an exercise:
   - The "originalExerciseId" must be REMOVED from newPlan
   - The "newExerciseId" must be ADDED to newPlan (if not already present)
   - Do NOT use an exercise that's already in the workout as a replacement

3. Do NOT return only the changed exercises - return the full workout plan.

## RESPONSE FORMAT
Respond with ONLY a JSON object in this exact format:

{
  "summary": "Brief description of changes (10-500 characters)",
  "newPlan": [
    {
      "exerciseId": "exercise-id-from-available-list",
      "sets": 3,
      "reps": 5,
      "weight": 60.0
    }
  ],
  "changes": [
    {
      "type": "replace|modify_sets|modify_reps|modify_weight|reorder|remove|add",
      "originalExerciseId": "original-id (required for replace/remove)",
      "newExerciseId": "new-id (required for replace/add)",
      "reason": "Clear explanation of what changed and why"
    }
  ],
  "warnings": ["Any warnings about intensity changes, etc."]
}

Rules:
- exerciseId MUST match exactly from available exercises
- sets: 1-20, reps: 0-100, weight: 0-1000 (in kg)
- reps should be 0 for time-based exercises (plank, hanging-knee-raise, etc.)
- weight should be 0 for bodyweight exercises (pull-ups, hanging-knee-raise, etc.)
- Preserve order of completed exercises
- Include warmup sets in the plan if appropriate
- Be conservative with weight recommendations when substituting exercises
- CRITICAL: For "replace" type, the originalExerciseId must NOT appear in newPlan - it's been replaced by newExerciseId

Example of CORRECT replacement:
- Original plan: squat, bench-press, barbell-row
- User wants to replace squat (no squat-rack available)
- CORRECT newPlan: bench-press, barbell-row, leg-press
- CORRECT change: { type: "replace", originalExerciseId: "squat", newExerciseId: "leg-press", reason: "..." }

Example of INCORRECT replacement:
- Original plan: squat, bench-press, barbell-row  
- INCORRECT newPlan: barbell-row, bench-press, pull-up (squat removed, but barbell-row already existed!)
- INCORRECT change: { type: "replace", originalExerciseId: "squat", newExerciseId: "barbell-row" }`;

  return prompt;
}

// ============================================================================
// LLM Provider Integration
// ============================================================================

/**
 * Call the LLM provider
 */
async function callLlm(prompt: string, config: LlmConfig): Promise<RawLlmResponse> {
  const { provider, apiKey, model, maxTokens, temperature } = config;

  if (provider === 'openai') {
    return callOpenAI(prompt, apiKey, model || 'gpt-4o-mini', maxTokens, temperature);
  } else if (provider === 'anthropic') {
    return callAnthropic(prompt, apiKey, model || 'claude-3-haiku-20240307', maxTokens, temperature);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens?: number,
  temperature?: number
): Promise<RawLlmResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a fitness trainer that responds only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
      temperature: temperature ?? DEFAULT_TEMPERATURE,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
    tokensUsed: data.usage?.total_tokens,
    finishReason: data.choices[0]?.finish_reason || 'unknown',
  };
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens?: number,
  temperature?: number
): Promise<RawLlmResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
      temperature: temperature ?? DEFAULT_TEMPERATURE,
      messages: [
        { 
          role: 'user', 
          content: `You are a fitness trainer that responds only with valid JSON.\n\n${prompt}` 
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.content?.[0]?.text || '',
    model: data.model,
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
    finishReason: data.stop_reason || 'unknown',
  };
}

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Parse and validate the LLM response through multiple layers
 */
function parseAndValidateResponse(
  rawResponse: RawLlmResponse,
  request: ModificationRequest,
  validExerciseIds: Set<string>,
  availableEquipment: string[],
  exerciseEquipmentMap: Map<string, string[]>
): ValidationResult {
  
  // Layer 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse.content);
  } catch (e) {
    return {
      success: false,
      error: {
        type: 'parse_error',
        message: 'Failed to parse LLM response as JSON',
        details: [e instanceof Error ? e.message : 'Unknown parse error'],
        rawResponse: rawResponse.content,
      },
    };
  }

  // Layer 2: Zod schema validation
  const zodResult = ModificationResponseSchema.safeParse(parsed);
  if (!zodResult.success) {
    return {
      success: false,
      error: {
        type: 'schema_validation',
        message: 'Response does not match expected schema',
        details: zodResult.error.issues.map((e) => 
          `${e.path.join('.')}: ${e.message}`
        ),
        rawResponse: rawResponse.content,
      },
    };
  }

  const validatedData = zodResult.data;

  console.log('=== AI Response Validation ===');
  console.log('Original plan exercises:', request.currentPlan.map(ex => ex.exerciseId));
  console.log('AI newPlan exercises:', validatedData.newPlan.map(ex => ex.exerciseId));
  console.log('AI changes:', validatedData.changes);

  // Layer 3: Validate exercise IDs exist
  const exerciseValidation = validateExerciseIds(validatedData, validExerciseIds);
  if (!exerciseValidation.valid) {
    return {
      success: false,
      error: {
        type: 'invalid_exercise',
        message: `Unknown exercise IDs: ${exerciseValidation.invalidIds.join(', ')}`,
        details: exerciseValidation.invalidIds,
        rawResponse: rawResponse.content,
      },
    };
  }

  // Layer 4: Validate equipment availability
  const equipmentValidation = validateEquipment(
    validatedData, 
    availableEquipment, 
    exerciseEquipmentMap
  );
  if (!equipmentValidation.valid) {
    return {
      success: false,
      error: {
        type: 'missing_equipment',
        message: 'Some exercises require unavailable equipment',
        details: equipmentValidation.violations.map(v => 
          `${v.exerciseId} needs: ${v.missing.join(', ')}`
        ),
        rawResponse: rawResponse.content,
      },
    };
  }

  // Layer 5: Validate changes reference valid exercises
  for (const change of validatedData.changes) {
    if (change.originalExerciseId && !validExerciseIds.has(change.originalExerciseId)) {
      return {
        success: false,
        error: {
          type: 'invalid_change',
          message: `Change references unknown original exercise: ${change.originalExerciseId}`,
          rawResponse: rawResponse.content,
        },
      };
    }
    if (change.newExerciseId && !validExerciseIds.has(change.newExerciseId)) {
      return {
        success: false,
        error: {
          type: 'invalid_change',
          message: `Change references unknown new exercise: ${change.newExerciseId}`,
          rawResponse: rawResponse.content,
        },
      };
    }
  }

  // Layer 6: Validate replace operations - original exercise should not still be in plan
  for (const change of validatedData.changes) {
    if (change.type === 'replace' && change.originalExerciseId) {
      // If it's a replace, the original exercise should NOT be in the new plan
      const originalStillPresent = validatedData.newPlan.some(
        ex => ex.exerciseId === change.originalExerciseId
      );
      if (originalStillPresent) {
        console.error('VALIDATION FAIL: Replace operation invalid');
        console.error('  Change:', change);
        console.error('  newPlan exercise IDs:', validatedData.newPlan.map(ex => ex.exerciseId));
        return {
          success: false,
          error: {
            type: 'invalid_change',
            message: `The AI said it replaced "${change.originalExerciseId}" but it's still in the workout plan`,
            details: [
              'When replacing an exercise, the original should be removed from the plan.',
              'The AI seems confused about the changes it made.',
              'Please try again with a clearer request.'
            ],
            rawResponse: rawResponse.content,
          },
        };
      }
    }
  }

  // Layer 7: Validate only NEW exercises (added by AI) are in the available list
  // Exercises that were already in the original workout are allowed even if they
  // require equipment not in the user's list (user might have temporary access)
  
  // Define these sets first (needed by multiple validation layers)
  const originalExerciseIds = new Set(request.currentPlan.map(ex => ex.exerciseId));
  const newExerciseIds = new Set(validatedData.newPlan.map(ex => ex.exerciseId));
  
  const availableExerciseIds = new Set(
    EXERCISES
      .filter(ex => ex.equipment.length === 0 || ex.equipment.some(eq => availableEquipment.includes(eq)))
      .map(ex => ex.id)
  );
  
  // Only check exercises that are NEW (not in original workout)
  const newlyAddedExerciseIds = [...newExerciseIds].filter(id => !originalExerciseIds.has(id));
  
  for (const exerciseId of newlyAddedExerciseIds) {
    if (!availableExerciseIds.has(exerciseId)) {
      const exerciseData = EXERCISES.find(ex => ex.id === exerciseId);
      const requiredEquipment = exerciseData?.equipment || [];
      const missingEquipment = requiredEquipment.filter(eq => !availableEquipment.includes(eq));
      
      return {
        success: false,
        error: {
          type: 'missing_equipment',
          message: `Exercise "${exerciseId}" requires equipment you don't have: ${missingEquipment.join(', ')}`,
          details: [
            `Your available equipment: ${availableEquipment.join(', ')}`,
            `Required: ${requiredEquipment.join(', ')}`,
            'The AI suggested an exercise that requires unavailable equipment.',
            'Try requesting a different exercise or use manual options.'
          ],
          rawResponse: rawResponse.content,
        },
      };
    }
  }

  // Layer 8 & 9: Validate exercise set consistency (uses sets defined in Layer 7)
  console.log('Validation - Original exercises:', [...originalExerciseIds]);
  console.log('Validation - New exercises:', [...newExerciseIds]);
  
  // Check for unexpected additions
  // Get exercises that were added via replacement (these are allowed)
  const replacedExerciseIds = new Set(
    validatedData.changes
      .filter(c => c.type === 'replace' && c.newExerciseId)
      .map(c => c.newExerciseId!)
  );
  
  // Added exercises that are NOT replacements are unexpected
  const addedExercises = [...newExerciseIds].filter(
    id => !originalExerciseIds.has(id) && !replacedExerciseIds.has(id)
  );
  const hasExplicitAdditions = validatedData.changes.some(c => c.type === 'add');
  
  console.log('Validation - Replaced exercise IDs (allowed additions):', [...replacedExerciseIds]);
  console.log('Validation - Added exercises (not in original, not replacements):', addedExercises);
  console.log('Validation - Has explicit additions in changes:', hasExplicitAdditions);
  
  if (addedExercises.length > 0 && !hasExplicitAdditions) {
    console.error('VALIDATION FAIL: Unexpected additions');
    return {
      success: false,
      error: {
        type: 'invalid_change',
        message: `The AI added new exercises that weren't in the original workout: ${addedExercises.join(', ')}`,
        details: [
          'The AI should not add exercises unless explicitly asked.',
          'The workout plan should only contain modifications of existing exercises.',
          'Please try again with a clearer request.'
        ],
        rawResponse: rawResponse.content,
      },
    };
  }

  // Check for unexpected removals
  // Get exercises that were removed via replacement (these are allowed to be removed)
  const removedViaReplacement = new Set(
    validatedData.changes
      .filter(c => c.type === 'replace' && c.originalExerciseId)
      .map(c => c.originalExerciseId!)
  );
  
  // Removed exercises that are NOT replacements are unexpected
  const removedExercises = [...originalExerciseIds].filter(
    id => !newExerciseIds.has(id) && !removedViaReplacement.has(id)
  );
  const hasExplicitRemovals = validatedData.changes.some(c => c.type === 'remove');
  
  console.log('Validation - Removed via replacement (allowed):', [...removedViaReplacement]);
  console.log('Validation - Removed exercises (missing, not replacements):', removedExercises);
  console.log('Validation - Has explicit removals in changes:', hasExplicitRemovals);
  
  // If exercises were removed but not via replacement and not explicitly removed, it's an error
  if (removedExercises.length > 0 && !hasExplicitRemovals) {
    console.error('VALIDATION FAIL: Missing exercises without explicit removal');
    return {
      success: false,
      error: {
        type: 'incomplete_plan',
        message: `The response is missing ${removedExercises.length} exercise(s) from the original workout`,
        details: [
          `Missing: ${removedExercises.join(', ')}`,
          'The AI should return ALL exercises, not just the changed ones.',
          'Please try again or rephrase your request.'
        ],
        rawResponse: rawResponse.content,
      },
    };
  }
  
  // Also warn if the plan seems too small (less than half the original exercises)
  if (validatedData.newPlan.length < request.currentPlan.length / 2) {
    return {
      success: false,
      error: {
        type: 'incomplete_plan',
        message: `The response only includes ${validatedData.newPlan.length} exercises (original had ${request.currentPlan.length})`,
        details: [
          'The returned plan appears to be incomplete.',
          'The AI should return the complete workout plan, not just modifications.'
        ],
        rawResponse: rawResponse.content,
      },
    };
  }

  // Layer 8: Safety checks
  console.log('Validation - Running safety checks...');
  const safetyResult = runSafetyChecks(validatedData, request.currentPlan);
  if (!safetyResult.passed) {
    const criticalFailures = safetyResult.failures.filter(f => 
      f.check === 'weight_too_high' || f.check === 'volume_too_high'
    );
    
    if (criticalFailures.length > 0) {
      return {
        success: false,
        error: {
          type: 'safety_check',
          message: safetyResult.failures.map(f => f.message).join('; '),
          details: safetyResult.failures.map(f => `${f.check}: ${f.message}`),
          rawResponse: rawResponse.content,
        },
      };
    }
    // Non-critical failures just become warnings
    validatedData.warnings.push(
      ...safetyResult.failures.map(f => f.message)
    );
  }

  // All validations passed
  console.log('=== All validations passed ===');
  return { success: true, data: validatedData };
}

// ============================================================================
// Response Conversion
// ============================================================================

/**
 * Convert validated LLM response to our internal ModificationResponse format
 */
function convertToModificationResponse(
  validatedData: ValidatedModificationResponse,
  rawResponse: RawLlmResponse,
  request: ModificationRequest
): ModificationResponse {
  return {
    summary: validatedData.summary,
    newPlan: validatedData.newPlan.map(ex => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      timeSeconds: ex.timeSeconds,
    })),
    changes: validatedData.changes.map(change => ({
      type: change.type,
      originalExerciseId: change.originalExerciseId,
      newExerciseId: change.newExerciseId,
      reason: change.reason,
      details: change.details,
    })),
    warnings: validatedData.warnings,
    metadata: {
      generatedAt: Date.now(),
      modelUsed: rawResponse.model,
      tokensUsed: rawResponse.tokensUsed,
    },
  };
}

// ============================================================================
// Fallback Options
// ============================================================================

export interface FallbackOption {
  id: string;
  name: string;
  description: string;
  category: 'equipment' | 'injury' | 'intensity';
  apply: (currentPlan: PlannedExercise[]) => PlannedExercise[];
}

/**
 * Generate fallback options based on hard-coded rules
 * when AI is unavailable or fails
 */
function generateFallbackOptions(request: ModificationRequest): FallbackOption[] {
  const options: FallbackOption[] = [];
  const { currentPlan, availableEquipment } = request;

  // Check each exercise for substitutions
  for (const exercise of currentPlan) {
    const subs = getSubstitutionsForExercise(
      exercise.exerciseId,
      availableEquipment,
      'equipment'
    );

    for (const sub of subs) {
      const subExercise = getExerciseById(sub.exerciseId);
      if (!subExercise) continue;

      options.push({
        id: `replace-${exercise.exerciseId}-${sub.exerciseId}`,
        name: `Replace ${getExerciseById(exercise.exerciseId)?.name} with ${subExercise.name}`,
        description: sub.description,
        category: sub.reason === 'equipment' ? 'equipment' : 'intensity',
        apply: (plan) => plan.map(ex => 
          ex.exerciseId === exercise.exerciseId 
            ? { 
                ...ex, 
                exerciseId: sub.exerciseId,
                weight: sub.intensityChange === 'lower' ? ex.weight * 0.7 : ex.weight,
              }
            : ex
        ),
      });
    }
  }

  // Add volume modification options
  options.push({
    id: 'reduce-volume-25',
    name: 'Reduce volume by 25%',
    description: 'Keep same exercises, reduce sets by 1 (min 1)',
    category: 'intensity',
    apply: (plan) => plan.map(ex => ({
      ...ex,
      sets: Math.max(1, Math.floor(ex.sets * 0.75)),
    })),
  });

  options.push({
    id: 'reduce-volume-50',
    name: 'Reduce volume by 50%',
    description: 'Keep same exercises, reduce sets by half (min 1)',
    category: 'intensity',
    apply: (plan) => plan.map(ex => ({
      ...ex,
      sets: Math.max(1, Math.floor(ex.sets * 0.5)),
    })),
  });

  return options.slice(0, 6); // Limit to 6 options
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Validate a modification request before sending to AI
 */
export function validateModificationRequest(
  request: ModificationRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.userRequest.trim()) {
    errors.push('User request cannot be empty');
  }

  if (request.userRequest.length > 1000) {
    errors.push('User request is too long (max 1000 characters)');
  }

  if (request.currentPlan.length === 0) {
    errors.push('Current plan cannot be empty');
  }

  if (request.availableEquipment.length === 0) {
    errors.push('No equipment specified - at least bodyweight should be available');
  }

  // Check for invalid exercise IDs in current plan
  for (const exercise of request.currentPlan) {
    if (!VALID_EXERCISE_IDS.has(exercise.exerciseId)) {
      errors.push(`Invalid exercise ID in current plan: ${exercise.exerciseId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get estimated token count for a request (rough estimate)
 */
export function estimateTokenCount(request: ModificationRequest): number {
  const prompt = buildModificationPrompt(request);
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(prompt.length / 4);
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): provider is 'openai' | 'anthropic' {
  return provider === 'openai' || provider === 'anthropic';
}
