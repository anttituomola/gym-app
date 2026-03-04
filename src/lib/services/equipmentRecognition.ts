import { z } from 'zod';
import { convex, api } from '$lib/convex';
import type { 
  EquipmentRecognitionRequest,
  EquipmentRecognitionResponse,
  RecognizedEquipment,
  SuggestedExercise,
} from '$lib/types/equipment';
import type { LlmConfig } from '$lib/types/ai';
import { EQUIPMENT_CATEGORIES } from '$lib/types/equipment';

/**
 * AI Equipment Recognition Service
 * 
 * Calls Convex action which then calls vision-capable LLMs (GPT-5.2, Claude Sonnet 4.5)
 * to analyze gym equipment photos and suggest exercises.
 * 
 * Note: The actual API calls happen server-side in Convex to avoid CORS issues.
 */

// ============================================================================
// Constants & Model Selection
// ============================================================================

/**
 * Latest models as of March 2026
 * Auto-selected based on provider
 */
const DEFAULT_MODELS = {
  // OpenAI: GPT-5.2 is current flagship (GPT-4o deprecated Feb 2026)
  openai: 'gpt-5.2',
  // Anthropic: Claude Sonnet 4.5 is best balance of capability & cost for vision
  // Opus 4.6 available for higher quality at higher cost
  anthropic: 'claude-sonnet-4.5',
} as const;

// ============================================================================
// Zod Validation Schemas
// ============================================================================

const RecognizedEquipmentSchema = z.object({
  name: z.string().min(1).max(100),
  normalizedName: z.string().min(1).max(100),
  category: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'cardio', 'bodyweight', 'other'] as const),
  description: z.string().min(10).max(500),
  confidence: z.number().min(0).max(1),
});

const SuggestedExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  normalizedName: z.string().min(1).max(100),
  category: z.enum(['legs', 'push', 'pull', 'core', 'cardio', 'full-body'] as const),
  primaryMuscles: z.array(z.string().min(1)).min(1).max(5),
  description: z.string().min(10).max(300),
  confidence: z.number().min(0).max(1),
});

const RecognitionResponseSchema = z.object({
  equipment: RecognizedEquipmentSchema,
  suggestedExercises: z.array(SuggestedExerciseSchema).min(1).max(10),
});

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Analyze gym equipment photos using AI vision
 * 
 * @param request - Contains 1-3 base64-encoded images
 * @param config - LLM provider configuration
 * @returns Recognized equipment and suggested exercises
 */
export async function recognizeEquipment(
  request: EquipmentRecognitionRequest,
  config: LlmConfig
): Promise<EquipmentRecognitionResponse> {
  
  if (request.images.length === 0) {
    throw new Error('At least one image is required');
  }
  
  if (request.images.length > 3) {
    throw new Error('Maximum 3 images allowed');
  }
  
  // Use specified model or default to latest appropriate model
  const selectedModel = config.model || DEFAULT_MODELS[config.provider];
  
  try {
    // Call the Convex action (server-side) to avoid CORS issues
    const result = await convex.action(api.equipmentRecognition.analyzeEquipmentPhotos, {
      images: request.images,
      provider: config.provider,
      apiKey: config.apiKey,
      model: selectedModel,
    });
    
    // Validate the response
    const validation = RecognitionResponseSchema.safeParse(result);
    
    if (!validation.success) {
      throw new Error(`AI response validation failed: ${validation.error.message}`);
    }
    
    return validation.data;
  } catch (error) {
    throw new Error(`Failed to analyze equipment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compress an image file before sending to AI
 * Returns base64-encoded compressed image
 */
export async function compressImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, quality).split(',')[1];
      
      resolve({ base64, mimeType });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Generate a UUID, with fallback for browsers that don't support crypto.randomUUID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get the default model for a provider
 * Useful for displaying to users
 */
export function getDefaultModel(provider: 'openai' | 'anthropic'): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Auto-detect provider from API key format
 * - OpenAI: starts with 'sk-' (but not 'sk-ant-')
 * - Anthropic: starts with 'sk-ant-'
 */
export function detectProviderFromKey(apiKey: string): 'openai' | 'anthropic' | null {
  const trimmed = apiKey.trim();
  
  if (trimmed.startsWith('sk-ant-')) {
    return 'anthropic';
  }
  if (trimmed.startsWith('sk-')) {
    return 'openai';
  }
  
  // Could not detect
  return null;
}
