import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { EXERCISES } from "./exercises";
import { roundToAchievableWeight } from "./plates";

// ============================================================================
// Type Definitions (mirrored from plan)
// ============================================================================

type Sex = "male" | "female";
type Goal = "strength" | "muscle" | "weight_loss" | "general";
type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type TimePerWorkout = 30 | 45 | 60 | 90;
type WorkoutsPerWeek = 2 | 3 | 4 | 5 | 6;

interface BiometricsInput {
  sex: Sex;
  bodyWeight: number;
  bodyWeightUnit: "kg" | "lbs";
  height: number;
  heightUnit: "cm" | "inches";
}

interface TrainingGoalsInput {
  primaryGoal: Goal;
  experienceLevel: ExperienceLevel;
  timePerWorkout: TimePerWorkout;
  workoutsPerWeek: WorkoutsPerWeek;
}

// ============================================================================
// Validation Helpers
// ============================================================================

const VALIDATION_RANGES = {
  bodyWeight: { min: 30, max: 300 }, // kg
  bodyWeightLbs: { min: 66, max: 660 }, // lbs
  height: { min: 100, max: 250 }, // cm
  heightInches: { min: 39, max: 98 }, // inches
};

function validateBiometrics(input: BiometricsInput): { valid: boolean; error?: string } {
  // Validate sex
  if (!input.sex || !["male", "female"].includes(input.sex)) {
    return { valid: false, error: "Sex must be 'male' or 'female'" };
  }

  // Validate body weight
  if (input.bodyWeightUnit === "kg") {
    if (input.bodyWeight < VALIDATION_RANGES.bodyWeight.min || 
        input.bodyWeight > VALIDATION_RANGES.bodyWeight.max) {
      return { 
        valid: false, 
        error: `Body weight must be between ${VALIDATION_RANGES.bodyWeight.min}-${VALIDATION_RANGES.bodyWeight.max} kg` 
      };
    }
  } else {
    if (input.bodyWeight < VALIDATION_RANGES.bodyWeightLbs.min || 
        input.bodyWeight > VALIDATION_RANGES.bodyWeightLbs.max) {
      return { 
        valid: false, 
        error: `Body weight must be between ${VALIDATION_RANGES.bodyWeightLbs.min}-${VALIDATION_RANGES.bodyWeightLbs.max} lbs` 
      };
    }
  }

  // Validate height
  if (input.heightUnit === "cm") {
    if (input.height < VALIDATION_RANGES.height.min || 
        input.height > VALIDATION_RANGES.height.max) {
      return { 
        valid: false, 
        error: `Height must be between ${VALIDATION_RANGES.height.min}-${VALIDATION_RANGES.height.max} cm` 
      };
    }
  } else {
    if (input.height < VALIDATION_RANGES.heightInches.min || 
        input.height > VALIDATION_RANGES.heightInches.max) {
      return { 
        valid: false, 
        error: `Height must be between ${VALIDATION_RANGES.heightInches.min}-${VALIDATION_RANGES.heightInches.max} inches` 
      };
    }
  }

  return { valid: true };
}

function validateTrainingGoals(input: TrainingGoalsInput): { valid: boolean; error?: string } {
  // Validate primary goal
  const validGoals = ["strength", "muscle", "weight_loss", "general"];
  if (!validGoals.includes(input.primaryGoal)) {
    return { valid: false, error: `Goal must be one of: ${validGoals.join(", ")}` };
  }

  // Validate experience level
  const validLevels = ["beginner", "intermediate", "advanced"];
  if (!validLevels.includes(input.experienceLevel)) {
    return { valid: false, error: `Experience level must be one of: ${validLevels.join(", ")}` };
  }

  // Validate time per workout
  const validTimes = [30, 45, 60, 90];
  if (!validTimes.includes(input.timePerWorkout)) {
    return { valid: false, error: `Time per workout must be one of: ${validTimes.join(", ")}` };
  }

  // Validate workouts per week
  const validFrequencies = [2, 3, 4, 5, 6];
  if (!validFrequencies.includes(input.workoutsPerWeek)) {
    return { valid: false, error: `Workouts per week must be one of: ${validFrequencies.join(", ")}` };
  }

  return { valid: true };
}

// ============================================================================
// Unit Conversion Helpers
// ============================================================================

function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

function inchesToCm(inches: number): number {
  return Math.round((inches / 0.393701) * 10) / 10;
}

function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

// ============================================================================
// Starting Weight Calculation
// ============================================================================

// Base multipliers (% of body weight) for beginners
const BASE_MULTIPLIERS = {
  male: {
    beginner: {
      squat: 0.75,
      "bench-press": 0.60,
      "barbell-row": 0.55,
      "overhead-press": 0.40,
      deadlift: 0.90,
    },
    intermediate: {
      squat: 1.00,
      "bench-press": 0.75,
      "barbell-row": 0.70,
      "overhead-press": 0.50,
      deadlift: 1.20,
    },
    advanced: {
      squat: 1.25,
      "bench-press": 1.00,
      "barbell-row": 0.90,
      "overhead-press": 0.65,
      deadlift: 1.50,
    },
  },
  female: {
    beginner: {
      squat: 0.65,
      "bench-press": 0.45,
      "barbell-row": 0.40,
      "overhead-press": 0.30,
      deadlift: 0.80,
    },
    intermediate: {
      squat: 0.85,
      "bench-press": 0.55,
      "barbell-row": 0.50,
      "overhead-press": 0.40,
      deadlift: 1.00,
    },
    advanced: {
      squat: 1.05,
      "bench-press": 0.70,
      "barbell-row": 0.65,
      "overhead-press": 0.50,
      deadlift: 1.25,
    },
  },
};

// Goal adjustments
const GOAL_ADJUSTMENTS: Record<Goal, { weightMultiplier: number; repAdjustment: number }> = {
  strength: { weightMultiplier: 1.10, repAdjustment: -1 },
  muscle: { weightMultiplier: 1.00, repAdjustment: 0 },
  weight_loss: { weightMultiplier: 0.90, repAdjustment: 2 },
  general: { weightMultiplier: 1.00, repAdjustment: 0 },
};

function calculateStartingWeights(
  bodyWeightKg: number,
  sex: Sex,
  experienceLevel: ExperienceLevel,
  primaryGoal: Goal
): Record<string, number> {
  const multipliers = BASE_MULTIPLIERS[sex][experienceLevel];
  const goalAdjustment = GOAL_ADJUSTMENTS[primaryGoal].weightMultiplier;
  
  const weights: Record<string, number> = {};
  
  for (const [exerciseId, multiplier] of Object.entries(multipliers)) {
    // Calculate base weight
    let weight = bodyWeightKg * multiplier * goalAdjustment;
    
    // Round to achievable weight with available plates (ensures weight can actually be loaded)
    weight = roundToAchievableWeight(weight);
    
    // Safety caps
    const minWeight = exerciseId === "deadlift" ? 60 : 20; // Bar weight
    const maxWeight = bodyWeightKg * 1.5; // Safety limit
    
    weight = Math.max(minWeight, Math.min(weight, maxWeight));
    
    weights[exerciseId] = weight;
  }
  
  return weights;
}

// ============================================================================
// Program Generation
// ============================================================================

type SplitType = "full-body-ab" | "full-body-aba" | "upper-lower" | "modified-ppl" | "ppl";

function getSplitType(workoutsPerWeek: WorkoutsPerWeek): SplitType {
  switch (workoutsPerWeek) {
    case 2: return "full-body-ab";
    case 3: return "full-body-aba";
    case 4: return "upper-lower";
    case 5: return "modified-ppl";
    case 6: return "ppl";
    default: return "full-body-ab";
  }
}

interface TimeConfig {
  setsPerExercise: number;
  restSeconds: number;
  includeAccessories: boolean;
  accessoryCount: number;
}

function getTimeConfig(minutes: TimePerWorkout): TimeConfig {
  switch (minutes) {
    case 30:
      return {
        setsPerExercise: 2,
        restSeconds: 90,
        includeAccessories: false,
        accessoryCount: 0,
      };
    case 45:
      return {
        setsPerExercise: 3,
        restSeconds: 120,
        includeAccessories: true,
        accessoryCount: 1,
      };
    case 60:
      return {
        setsPerExercise: 3,
        restSeconds: 180,
        includeAccessories: true,
        accessoryCount: 2,
      };
    case 90:
      return {
        setsPerExercise: 4,
        restSeconds: 240,
        includeAccessories: true,
        accessoryCount: 3,
      };
  }
}

interface GoalConfig {
  repRange: { min: number; max: number };
  compoundRestSeconds: number;
  accessoryRestSeconds: number;
}

function getGoalConfig(goal: Goal): GoalConfig {
  switch (goal) {
    case "strength":
      return {
        repRange: { min: 3, max: 5 },
        compoundRestSeconds: 240,
        accessoryRestSeconds: 120,
      };
    case "muscle":
      return {
        repRange: { min: 8, max: 12 },
        compoundRestSeconds: 120,
        accessoryRestSeconds: 90,
      };
    case "weight_loss":
      return {
        repRange: { min: 10, max: 15 },
        compoundRestSeconds: 90,
        accessoryRestSeconds: 60,
      };
    case "general":
      return {
        repRange: { min: 6, max: 10 },
        compoundRestSeconds: 150,
        accessoryRestSeconds: 90,
      };
  }
}

function generateWorkoutName(splitType: SplitType, index: number): string {
  const labels = ["A", "B", "C", "D", "E"];
  switch (splitType) {
    case "full-body-ab":
    case "full-body-aba":
      return `Full Body ${labels[index]}`;
    case "upper-lower":
      return index % 2 === 0 ? "Upper Body" : "Lower Body";
    case "modified-ppl":
    case "ppl":
      const ppl = ["Push", "Pull", "Legs"];
      return ppl[index % 3];
    default:
      return `Workout ${labels[index]}`;
  }
}

interface ProgramExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  startingWeight: number;
  restSeconds: number;
  progression: {
    incrementKg: number;
    deloadAfterFailures: number;
    deloadPercent: number;
  };
}

interface ProgramWorkout {
  id: string;
  name: string;
  restBetweenSets: number;
  exercises: ProgramExercise[];
}

function generateProgram(
  biometrics: { sex: Sex; bodyWeightKg: number },
  goals: TrainingGoalsInput,
  startingWeights: Record<string, number>
): { workouts: ProgramWorkout[]; splitType: SplitType } {
  const splitType = getSplitType(goals.workoutsPerWeek);
  const timeConfig = getTimeConfig(goals.timePerWorkout);
  const goalConfig = getGoalConfig(goals.primaryGoal);
  
  // Determine number of unique workouts based on split type
  const uniqueWorkouts = splitType === "upper-lower" ? 2 : 
                         splitType === "ppl" ? 3 : 
                         splitType === "modified-ppl" ? 3 : 2;
  
  const workouts: ProgramWorkout[] = [];
  
  for (let i = 0; i < uniqueWorkouts; i++) {
    const workout: ProgramWorkout = {
      id: `workout-${i}`,
      name: generateWorkoutName(splitType, i),
      restBetweenSets: goalConfig.compoundRestSeconds,
      exercises: [],
    };
    
    // Select exercises based on split type and workout index
    const exercises = selectExercisesForWorkout(splitType, i, timeConfig, goals);
    
    for (const exerciseId of exercises) {
      const exercise = EXERCISES.find(e => e.id === exerciseId);
      if (!exercise) continue;
      
      const isCompound = ["squat", "bench-press", "deadlift", "barbell-row", "overhead-press"].includes(exerciseId);
      const isAccessory = !isCompound;
      
      // Skip accessories if time doesn't permit
      if (isAccessory && !timeConfig.includeAccessories) continue;
      
      // Determine sets and reps
      let sets = isCompound ? timeConfig.setsPerExercise : Math.max(2, timeConfig.setsPerExercise - 1);
      let reps = Math.floor((goalConfig.repRange.min + goalConfig.repRange.max) / 2);
      let restSeconds = isCompound ? goalConfig.compoundRestSeconds : goalConfig.accessoryRestSeconds;
      
      // Special case for deadlift (usually 1 set)
      if (exerciseId === "deadlift" && goals.primaryGoal === "strength") {
        sets = 1;
      }
      
      // Get starting weight (or default)
      const startingWeight = startingWeights[exerciseId] || (exerciseId === "deadlift" ? 60 : 20);
      
      workout.exercises.push({
        exerciseId,
        sets,
        reps,
        startingWeight,
        restSeconds,
        progression: exercise.defaultProgression,
      });
    }
    
    workouts.push(workout);
  }
  
  return { workouts, splitType };
}

function selectExercisesForWorkout(
  splitType: SplitType,
  workoutIndex: number,
  timeConfig: TimeConfig,
  goals: TrainingGoalsInput
): string[] {
  const compoundExercises = {
    push: ["bench-press", "overhead-press"],
    pull: ["barbell-row", "deadlift"],
    legs: ["squat"],
  };
  
  const accessoryExercises = {
    push: ["dumbbell-press", "dip"],
    pull: ["pull-up", "lat-pulldown", "seated-row"],
    legs: ["romaninan-deadlift", "goblet-squat"],
    core: ["plank", "hanging-knee-raise"],
  };
  
  switch (splitType) {
    case "full-body-ab":
    case "full-body-aba":
      if (workoutIndex === 0) {
        // Workout A: Push focus
        const exercises = ["squat", "bench-press", "barbell-row", "overhead-press"];
        if (timeConfig.includeAccessories) {
          exercises.push("plank");
        }
        return exercises;
      } else {
        // Workout B: Pull focus
        const exercises = ["squat", "overhead-press", "deadlift"];
        if (timeConfig.includeAccessories) {
          exercises.push("pull-up", "hanging-knee-raise");
        }
        return exercises;
      }
      
    case "upper-lower":
      if (workoutIndex === 0) {
        // Upper body
        const exercises = ["bench-press", "barbell-row", "overhead-press", "pull-up"];
        if (timeConfig.includeAccessories) {
          exercises.push("dumbbell-curl");
        }
        return exercises;
      } else {
        // Lower body
        const exercises = ["squat", "romaninan-deadlift"];
        if (timeConfig.includeAccessories) {
          exercises.push("goblet-squat", "hanging-knee-raise");
        }
        return exercises;
      }
      
    case "ppl":
    case "modified-ppl":
      if (workoutIndex === 0) {
        // Push
        const exercises = ["bench-press", "overhead-press"];
        if (timeConfig.includeAccessories) {
          exercises.push("incline-bench-press", "dip");
        }
        return exercises;
      } else if (workoutIndex === 1) {
        // Pull
        const exercises = ["deadlift", "barbell-row"];
        if (timeConfig.includeAccessories) {
          exercises.push("pull-up", "seated-row");
        }
        return exercises;
      } else {
        // Legs
        const exercises = ["squat"];
        if (timeConfig.includeAccessories) {
          exercises.push("romaninan-deadlift", "leg-press");
        }
        return exercises;
      }
      
    default:
      return ["squat", "bench-press", "barbell-row"];
  }
}

// ============================================================================
// Public API
// ============================================================================

// Get smart recommendation for schedule based on goal and experience
export const getSmartRecommendation = query({
  args: {
    primaryGoal: v.union(v.literal("strength"), v.literal("muscle"), v.literal("weight_loss"), v.literal("general")),
    experienceLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
  },
  handler: async (_ctx, args) => {
    const recommendations: Record<Goal, Record<ExperienceLevel, { timePerWorkout: TimePerWorkout; workoutsPerWeek: WorkoutsPerWeek; reasoning: string }>> = {
      strength: {
        beginner: { timePerWorkout: 60, workoutsPerWeek: 3, reasoning: "Focus on learning movements with adequate recovery" },
        intermediate: { timePerWorkout: 90, workoutsPerWeek: 4, reasoning: "Higher volume and frequency for strength gains" },
        advanced: { timePerWorkout: 90, workoutsPerWeek: 4, reasoning: "Specialized split with high volume" },
      },
      muscle: {
        beginner: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: "Moderate frequency allows adequate volume per session" },
        intermediate: { timePerWorkout: 60, workoutsPerWeek: 5, reasoning: "Higher frequency for increased weekly volume" },
        advanced: { timePerWorkout: 90, workoutsPerWeek: 5, reasoning: "High volume split targeting all muscles 2x/week" },
      },
      weight_loss: {
        beginner: { timePerWorkout: 45, workoutsPerWeek: 3, reasoning: "Sustainable starting point with cardio focus" },
        intermediate: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: "Higher frequency increases calorie burn" },
        advanced: { timePerWorkout: 60, workoutsPerWeek: 5, reasoning: "Maximum calorie expenditure with adequate recovery" },
      },
      general: {
        beginner: { timePerWorkout: 45, workoutsPerWeek: 3, reasoning: "Balanced approach for overall fitness" },
        intermediate: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: "Varied training for well-rounded fitness" },
        advanced: { timePerWorkout: 60, workoutsPerWeek: 4, reasoning: "Maintain fitness with efficient programming" },
      },
    };
    
    return recommendations[args.primaryGoal][args.experienceLevel];
  },
});

// Complete onboarding and generate personalized program
export const completeOnboarding = mutation({
  args: {
    userId: v.id("users"),
    biometrics: v.object({
      sex: v.union(v.literal("male"), v.literal("female")),
      bodyWeight: v.number(),
      bodyWeightUnit: v.union(v.literal("kg"), v.literal("lbs")),
      height: v.number(),
      heightUnit: v.union(v.literal("cm"), v.literal("inches")),
    }),
    trainingGoals: v.object({
      primaryGoal: v.union(v.literal("strength"), v.literal("muscle"), v.literal("weight_loss"), v.literal("general")),
      experienceLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
      timePerWorkout: v.union(v.literal(30), v.literal(45), v.literal(60), v.literal(90)),
      workoutsPerWeek: v.union(v.literal(2), v.literal(3), v.literal(4), v.literal(5), v.literal(6)),
    }),
  },
  handler: async (ctx, args) => {
    // Validate biometrics
    const bioValidation = validateBiometrics(args.biometrics);
    if (!bioValidation.valid) {
      throw new Error(`Biometrics validation failed: ${bioValidation.error}`);
    }
    
    // Validate training goals
    const goalValidation = validateTrainingGoals(args.trainingGoals);
    if (!goalValidation.valid) {
      throw new Error(`Training goals validation failed: ${goalValidation.error}`);
    }
    
    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!profile) {
      throw new Error("User profile not found");
    }
    
    // Convert units to metric for storage
    const bodyWeightKg = args.biometrics.bodyWeightUnit === "lbs" 
      ? lbsToKg(args.biometrics.bodyWeight) 
      : args.biometrics.bodyWeight;
    
    const heightCm = args.biometrics.heightUnit === "inches"
      ? inchesToCm(args.biometrics.height)
      : args.biometrics.height;
    
    // Calculate BMI
    const bmi = calculateBMI(bodyWeightKg, heightCm);
    
    // Calculate starting weights
    const startingWeights = calculateStartingWeights(
      bodyWeightKg,
      args.biometrics.sex,
      args.trainingGoals.experienceLevel,
      args.trainingGoals.primaryGoal
    );
    
    // Generate program
    const { workouts, splitType } = generateProgram(
      { sex: args.biometrics.sex, bodyWeightKg },
      args.trainingGoals,
      startingWeights
    );
    
    // Create the training program
    const programId = await ctx.db.insert("trainingPrograms", {
      userId: args.userId,
      name: `${args.trainingGoals.primaryGoal.charAt(0).toUpperCase() + args.trainingGoals.primaryGoal.slice(1)} Program`,
      description: `${args.trainingGoals.workoutsPerWeek} days/week, ${args.trainingGoals.timePerWorkout} min sessions, ${splitType} split`,
      isActive: true,
      workouts: workouts.map(w => ({
        id: w.id,
        name: w.name,
        restBetweenSets: w.restBetweenSets,
        exercises: w.exercises.map(e => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          startingWeight: e.startingWeight,
          progression: e.progression,
          restSeconds: e.restSeconds,
        })),
      })),
    });
    
    // Update user profile with biometrics, goals, and unit preference
    const unitPreference: { weightUnit: "kg" | "lbs"; distanceUnit: "cm" | "inches" } = {
      weightUnit: args.biometrics.bodyWeightUnit,
      distanceUnit: args.biometrics.heightUnit === "inches" ? "inches" : "cm",
    };
    
    // Update exercise starting weights in profile
    const updatedExercises = { ...profile.exercises };
    for (const [exerciseId, weight] of Object.entries(startingWeights)) {
      if (updatedExercises[exerciseId]) {
        updatedExercises[exerciseId] = {
          ...updatedExercises[exerciseId],
          currentWeight: weight,
          weightUnit: unitPreference.weightUnit,
        };
      }
    }
    
    await ctx.db.patch(profile._id, {
      biometrics: {
        sex: args.biometrics.sex,
        bodyWeightKg,
        heightCm,
        bmi,
      },
      trainingGoals: {
        primaryGoal: args.trainingGoals.primaryGoal,
        experienceLevel: args.trainingGoals.experienceLevel,
        timePerWorkout: args.trainingGoals.timePerWorkout,
        workoutsPerWeek: args.trainingGoals.workoutsPerWeek,
      },
      unitPreference,
      onboardingCompleted: true,
      onboardingCompletedAt: Date.now(),
      exercises: updatedExercises,
      activeProgramId: programId,
    });
    
    // Deactivate any existing active programs
    const existingPrograms = await ctx.db
      .query("trainingPrograms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const p of existingPrograms) {
      if (p._id !== programId && p.isActive) {
        await ctx.db.patch(p._id, { isActive: false });
      }
    }
    
    return {
      programId,
      startingWeights,
      splitType,
    };
  },
});

// Preview starting weights without completing onboarding
export const previewStartingWeights = query({
  args: {
    biometrics: v.object({
      sex: v.union(v.literal("male"), v.literal("female")),
      bodyWeight: v.number(),
      bodyWeightUnit: v.union(v.literal("kg"), v.literal("lbs")),
    }),
    experienceLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    primaryGoal: v.union(v.literal("strength"), v.literal("muscle"), v.literal("weight_loss"), v.literal("general")),
  },
  handler: async (_ctx, args) => {
    // Validate
    if (args.biometrics.bodyWeightUnit === "kg") {
      if (args.biometrics.bodyWeight < 30 || args.biometrics.bodyWeight > 300) {
        throw new Error("Body weight must be between 30-300 kg");
      }
    } else {
      if (args.biometrics.bodyWeight < 66 || args.biometrics.bodyWeight > 660) {
        throw new Error("Body weight must be between 66-660 lbs");
      }
    }
    
    const bodyWeightKg = args.biometrics.bodyWeightUnit === "lbs"
      ? lbsToKg(args.biometrics.bodyWeight)
      : args.biometrics.bodyWeight;
    
    const weights = calculateStartingWeights(
      bodyWeightKg,
      args.biometrics.sex,
      args.experienceLevel,
      args.primaryGoal
    );
    
    return weights;
  },
});

// Create a new training program for existing users (doesn't reset onboarding status)
export const createNewProgram = mutation({
  args: {
    userId: v.id("users"),
    biometrics: v.object({
      sex: v.union(v.literal("male"), v.literal("female")),
      bodyWeight: v.number(),
      bodyWeightUnit: v.union(v.literal("kg"), v.literal("lbs")),
      height: v.number(),
      heightUnit: v.union(v.literal("cm"), v.literal("inches")),
    }),
    trainingGoals: v.object({
      primaryGoal: v.union(v.literal("strength"), v.literal("muscle"), v.literal("weight_loss"), v.literal("general")),
      experienceLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
      timePerWorkout: v.union(v.literal(30), v.literal(45), v.literal(60), v.literal(90)),
      workoutsPerWeek: v.union(v.literal(2), v.literal(3), v.literal(4), v.literal(5), v.literal(6)),
    }),
  },
  handler: async (ctx, args) => {
    // Validate biometrics
    const bioValidation = validateBiometrics(args.biometrics);
    if (!bioValidation.valid) {
      throw new Error(`Biometrics validation failed: ${bioValidation.error}`);
    }
    
    // Validate training goals
    const goalValidation = validateTrainingGoals(args.trainingGoals);
    if (!goalValidation.valid) {
      throw new Error(`Training goals validation failed: ${goalValidation.error}`);
    }
    
    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!profile) {
      throw new Error("User profile not found");
    }
    
    // Convert units to metric for storage
    const bodyWeightKg = args.biometrics.bodyWeightUnit === "lbs" 
      ? lbsToKg(args.biometrics.bodyWeight) 
      : args.biometrics.bodyWeight;
    
    const heightCm = args.biometrics.heightUnit === "inches"
      ? inchesToCm(args.biometrics.height)
      : args.biometrics.height;
    
    // Calculate BMI
    const bmi = calculateBMI(bodyWeightKg, heightCm);
    
    // Calculate starting weights
    const startingWeights = calculateStartingWeights(
      bodyWeightKg,
      args.biometrics.sex,
      args.trainingGoals.experienceLevel,
      args.trainingGoals.primaryGoal
    );
    
    // Generate program
    const { workouts, splitType } = generateProgram(
      { sex: args.biometrics.sex, bodyWeightKg },
      args.trainingGoals,
      startingWeights
    );
    
    // Create the training program
    const programId = await ctx.db.insert("trainingPrograms", {
      userId: args.userId,
      name: `${args.trainingGoals.primaryGoal.charAt(0).toUpperCase() + args.trainingGoals.primaryGoal.slice(1)} Program`,
      description: `${args.trainingGoals.workoutsPerWeek} days/week, ${args.trainingGoals.timePerWorkout} min sessions, ${splitType} split`,
      isActive: true,
      workouts: workouts.map(w => ({
        id: w.id,
        name: w.name,
        restBetweenSets: w.restBetweenSets,
        exercises: w.exercises.map(e => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          startingWeight: e.startingWeight,
          progression: e.progression,
          restSeconds: e.restSeconds,
        })),
      })),
    });
    
    // Update user profile with new biometrics, goals, and unit preference
    // But DON'T reset onboarding status - keep user's existing exercise progress
    const unitPreference: { weightUnit: "kg" | "lbs"; distanceUnit: "cm" | "inches" } = {
      weightUnit: args.biometrics.bodyWeightUnit,
      distanceUnit: args.biometrics.heightUnit === "inches" ? "inches" : "cm",
    };
    
    // Only update exercise weights for exercises that don't have current progress
    // or if the user has never set a weight for them
    const updatedExercises = { ...profile.exercises };
    for (const [exerciseId, weight] of Object.entries(startingWeights)) {
      // Only set starting weight if user hasn't recorded progress for this exercise
      const existing = updatedExercises[exerciseId];
      if (existing && existing.successCount === 0 && existing.failureCount === 0) {
        // User hasn't completed any sets, safe to update starting weight
        updatedExercises[exerciseId] = {
          ...existing,
          currentWeight: weight,
          weightUnit: unitPreference.weightUnit,
        };
      }
    }
    
    await ctx.db.patch(profile._id, {
      biometrics: {
        sex: args.biometrics.sex,
        bodyWeightKg,
        heightCm,
        bmi,
      },
      trainingGoals: {
        primaryGoal: args.trainingGoals.primaryGoal,
        experienceLevel: args.trainingGoals.experienceLevel,
        timePerWorkout: args.trainingGoals.timePerWorkout,
        workoutsPerWeek: args.trainingGoals.workoutsPerWeek,
      },
      unitPreference,
      exercises: updatedExercises,
      activeProgramId: programId,
    });
    
    // Deactivate any existing active programs
    const existingPrograms = await ctx.db
      .query("trainingPrograms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const p of existingPrograms) {
      if (p._id !== programId && p.isActive) {
        await ctx.db.patch(p._id, { isActive: false });
      }
    }
    
    return {
      programId,
      startingWeights,
      splitType,
    };
  },
});
