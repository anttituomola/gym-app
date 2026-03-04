/**
 * Equipment and AI recognition types
 */

// ============================================================================
// Equipment Categories
// ============================================================================

export const EQUIPMENT_CATEGORIES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'cardio',
  'bodyweight',
  'other'
] as const;

export type EquipmentCategory = typeof EQUIPMENT_CATEGORIES[number];

// ============================================================================
// Database Types (matching Convex schema)
// ============================================================================

export interface Equipment {
  _id: string;
  _creationTime: number;
  userId: string;
  name: string;
  normalizedName: string;
  category: EquipmentCategory;
  description?: string;
  imageStorageIds?: string[];
  isCustom: boolean;
  recognitionConfidence?: number;
  createdAt: number;
}

// ============================================================================
// AI Recognition Types
// ============================================================================

export interface EquipmentRecognitionRequest {
  images: {
    base64: string;
    mimeType: string;
  }[];  // 1-3 images
}

export interface RecognizedEquipment {
  name: string;
  normalizedName: string;
  category: EquipmentCategory;
  description: string;
  confidence: number;  // 0-1
}

export interface SuggestedExercise {
  name: string;
  normalizedName: string;
  category: 'legs' | 'push' | 'pull' | 'core' | 'cardio' | 'full-body';
  primaryMuscles: string[];
  description: string;
  confidence: number;
}

export interface EquipmentRecognitionResponse {
  equipment: RecognizedEquipment;
  suggestedExercises: SuggestedExercise[];
}

// ============================================================================
// Deduplication Types
// ============================================================================

export type DeduplicationStatus = 'new' | 'exact_match' | 'similar';

export interface EquipmentDeduplicationResult {
  status: DeduplicationStatus;
  existingEquipment?: Equipment;
  similarityScore: number;  // 0-1
  suggestedName?: string;   // For similar matches
}

export interface ExerciseDeduplicationResult {
  suggestedExercise: SuggestedExercise;
  status: DeduplicationStatus;
  existingExerciseId?: string;  // If exists in static or custom
  similarityScore: number;
}

export interface FullDeduplicationResult {
  equipment: EquipmentDeduplicationResult;
  exercises: ExerciseDeduplicationResult[];
}

// ============================================================================
// UI State Types
// ============================================================================

export type RecognitionStep = 
  | 'capture'      // Taking photos
  | 'analyzing'    // AI processing
  | 'review'       // Review dedup results
  | 'saving'       // Saving to DB
  | 'complete';    // Done

export interface CapturedImage {
  id: string;
  base64: string;
  mimeType: string;
  file: File;
  previewUrl: string;
  type: 'primary' | 'detail' | 'usage_plate';
}

export interface ReviewState {
  // Equipment editing
  equipmentName: string;
  equipmentCategory: EquipmentCategory;
  
  // Exercise selection
  selectedExercises: Set<string>;  // normalizedNames to create
  exerciseEdits: Record<string, {
    name: string;
    category: SuggestedExercise['category'];
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AnalyzeEquipmentResponse {
  recognition: EquipmentRecognitionResponse;
  deduplication: FullDeduplicationResult;
}

export interface SaveEquipmentRequest {
  equipment: {
    name: string;
    normalizedName: string;
    category: EquipmentCategory;
    description?: string;
    recognitionConfidence?: number;
  };
  imageStorageIds: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize equipment/exercise name for deduplication
 * - Lowercase
 * - Remove special characters
 * - Replace spaces with hyphens
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-');          // Spaces to hyphens
}

/**
 * Calculate similarity between two normalized names
 * Returns 0-1 score (1 = exact match)
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return 1;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  const len1 = n1.length;
  const len2 = n2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;
  
  return 1 - matrix[len1][len2] / maxLen;
}

/**
 * Determine deduplication status based on similarity score
 */
export function getDeduplicationStatus(
  similarity: number,
  exactThreshold = 0.95,
  similarThreshold = 0.75
): DeduplicationStatus {
  if (similarity >= exactThreshold) return 'exact_match';
  if (similarity >= similarThreshold) return 'similar';
  return 'new';
}

/**
 * Format category for display
 */
export function formatCategory(category: EquipmentCategory): string {
  return category
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
