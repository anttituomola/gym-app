// Exercise definitions
export interface Exercise {
  id: string;
  name: string;
  category: 'legs' | 'push' | 'pull' | 'core';
  primaryMuscles: string[];
  equipment: string[];
  defaultProgression: ProgressionRules;
  warmupFormula: WarmupStep[];
  isTimeBased?: boolean;
  defaultTimeSeconds?: number;
  supportsBodyweightProgression?: boolean;
  defaultReps?: number;
  defaultIncrementReps?: number;
}

export interface WarmupStep {
  percentOfWork: number;
  reps: number;
}

export interface ProgressionRules {
  incrementKg: number;
  deloadAfterFailures: number;
  deloadPercent: number;
}

// User's exercise settings
export interface UserExerciseSettings {
  currentWeight: number;
  weightUnit: 'kg' | 'lbs';
  successCount: number;
  failureCount: number;
  incrementKg: number;
  deloadAfterFailures: number;
  deloadPercent: number;
  // For bodyweight exercises that support rep-based progression
  useBodyweightProgression?: boolean;
  targetReps?: number;
  incrementReps?: number;
}

// Workout structures
export interface WorkoutPlan {
  exercises: PlannedExercise[];
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  timeSeconds?: number;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  type: 'warmup' | 'work';
  targetReps: number;
  targetWeight: number;
  targetTimeSeconds?: number;
  completedReps?: number;
  completedTimeSeconds?: number;
  completedAt?: number;
  failed: boolean;
  skipped?: boolean;
}

export interface ActiveWorkout {
  _id?: string;
  _creationTime?: number;
  userId: string;
  startedAt: number;
  completedAt?: number;
  status: 'active' | 'completed' | 'cancelled';
  plan: PlannedExercise[];
  sets: WorkoutSet[];
  currentSetIndex: number;
  modifications?: WorkoutModification;
}

export interface WorkoutModification {
  at: number;
  request: string;
  responseSummary: string;
  originalPlan: PlannedExercise[];
}

// Training Program
export interface TrainingProgram {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  workouts: ProgramWorkout[]; // A/B workouts or more
  isActive: boolean;
}

export interface ProgramWorkout {
  id: string;
  name: string;
  exercises: ProgramExercise[];
  restBetweenSets: number; // seconds
}

export interface ProgramExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  // Starting weight - if null, will use previous max or default
  startingWeight?: number;
  // Override progression rules from exercise defaults
  progression?: ProgressionRules;
  // Rest after this exercise (if different from workout default)
  restSeconds?: number;
}

// User profile
export interface UserProfile {
  _id: string;
  exercises: Record<string, UserExerciseSettings>;
  gymEquipment: string[];
  activeProgramId?: string;
  biometrics?: UserBiometrics;
  trainingGoals?: TrainingGoals;
  unitPreference?: UnitPreference;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: number;
}

// Onboarding types
export interface UserBiometrics {
  sex: 'male' | 'female';
  bodyWeightKg: number;
  heightCm: number;
  bmi?: number;
}

export interface TrainingGoals {
  primaryGoal: 'strength' | 'muscle' | 'weight_loss' | 'general';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  timePerWorkout: 30 | 45 | 60 | 90;
  workoutsPerWeek: 2 | 3 | 4 | 5 | 6;
}

export interface UnitPreference {
  weightUnit: 'kg' | 'lbs';
  distanceUnit: 'cm' | 'inches';
}

// Input types for forms (with display units)
export interface BiometricsInput {
  sex: 'male' | 'female';
  bodyWeight: number;
  bodyWeightUnit: 'kg' | 'lbs';
  height: number;
  heightUnit: 'cm' | 'inches';
}

export interface TrainingGoalsInput {
  primaryGoal: 'strength' | 'muscle' | 'weight_loss' | 'general';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  timePerWorkout: 30 | 45 | 60 | 90;
  workoutsPerWeek: 2 | 3 | 4 | 5 | 6;
}

// Equipment list
export const EQUIPMENT_LIST = [
  'barbell',
  'squat-rack',
  'bench',
  'dumbbells',
  'cable-machine',
  'leg-press',
  'pull-up-bar',
  'kettlebells',
  'resistance-bands'
] as const;

export type Equipment = typeof EQUIPMENT_LIST[number];

// Re-export AI types
export * from './ai';
