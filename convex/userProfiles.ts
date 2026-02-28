import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { EXERCISES } from "./exercises";

// Get or create user profile
export const getOrCreate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      // Initialize with default exercises
      const defaultExercises: Record<string, {
        currentWeight: number;
        weightUnit: "kg" | "lbs";
        successCount: number;
        failureCount: number;
        incrementKg: number;
        deloadAfterFailures: number;
        deloadPercent: number;
      }> = {};
      
      for (const exercise of EXERCISES.slice(0, 5)) { // Core 5 exercises
        defaultExercises[exercise.id] = {
          currentWeight: exercise.id === 'deadlift' ? 60 : 20, // Start with empty bar or light deadlift
          weightUnit: "kg",
          successCount: 0,
          failureCount: 0,
          incrementKg: exercise.defaultProgression.incrementKg,
          deloadAfterFailures: exercise.defaultProgression.deloadAfterFailures,
          deloadPercent: exercise.defaultProgression.deloadPercent,
        };
      }

      const profileId = await ctx.db.insert("userProfiles", {
        userId: args.userId,
        exercises: defaultExercises,
        gymEquipment: ["barbell", "squat-rack", "bench"],
        activeProgramId: undefined,
        unitPreference: {
          weightUnit: "kg",
          distanceUnit: "cm",
        },
        onboardingCompleted: false,
      });

      profile = await ctx.db.get(profileId);
    }

    return profile;
  },
});

// Get user profile
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Update exercise settings
export const updateExercise = mutation({
  args: {
    userId: v.id("users"),
    exerciseId: v.string(),
    settings: v.object({
      currentWeight: v.optional(v.number()),
      weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
      incrementKg: v.optional(v.number()),
      deloadAfterFailures: v.optional(v.number()),
      deloadPercent: v.optional(v.number()),
      useBodyweightProgression: v.optional(v.boolean()),
      targetReps: v.optional(v.number()),
      incrementReps: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const currentSettings = profile.exercises[args.exerciseId] || {
      currentWeight: 20,
      weightUnit: "kg",
      successCount: 0,
      failureCount: 0,
      incrementKg: 2.5,
      deloadAfterFailures: 3,
      deloadPercent: 0.1,
    };

    const updatedSettings = {
      ...currentSettings,
      ...args.settings,
    };

    await ctx.db.patch(profile._id, {
      exercises: {
        ...profile.exercises,
        [args.exerciseId]: updatedSettings,
      },
    });

    return updatedSettings;
  },
});

// Update gym equipment list
export const updateEquipment = mutation({
  args: {
    userId: v.id("users"),
    equipment: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      gymEquipment: args.equipment,
    });

    return args.equipment;
  },
});

// Get onboarding status
export const getOnboardingStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return { completed: false, hasBiometrics: false, hasGoals: false };
    }

    return {
      completed: profile.onboardingCompleted ?? false,
      hasBiometrics: !!profile.biometrics,
      hasGoals: !!profile.trainingGoals,
    };
  },
});

// Update unit preference
export const updateUnitPreference = mutation({
  args: {
    userId: v.id("users"),
    unitPreference: v.object({
      weightUnit: v.union(v.literal("kg"), v.literal("lbs")),
      distanceUnit: v.union(v.literal("cm"), v.literal("inches")),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      unitPreference: args.unitPreference,
    });

    return args.unitPreference;
  },
});

// Update biometrics (for settings page)
export const updateBiometrics = mutation({
  args: {
    userId: v.id("users"),
    biometrics: v.object({
      sex: v.union(v.literal("male"), v.literal("female")),
      bodyWeight: v.number(),
      bodyWeightUnit: v.union(v.literal("kg"), v.literal("lbs")),
      height: v.number(),
      heightUnit: v.union(v.literal("cm"), v.literal("inches")),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    // Convert to metric for storage
    const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10;
    const inchesToCm = (inches: number) => Math.round((inches / 0.393701) * 10) / 10;
    const calculateBMI = (weightKg: number, heightCm: number) => {
      const heightM = heightCm / 100;
      return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    };

    const bodyWeightKg = args.biometrics.bodyWeightUnit === "lbs"
      ? lbsToKg(args.biometrics.bodyWeight)
      : args.biometrics.bodyWeight;

    const heightCm = args.biometrics.heightUnit === "inches"
      ? inchesToCm(args.biometrics.height)
      : args.biometrics.height;

    const bmi = calculateBMI(bodyWeightKg, heightCm);

    await ctx.db.patch(profile._id, {
      biometrics: {
        sex: args.biometrics.sex,
        bodyWeightKg,
        heightCm,
        bmi,
      },
      // Also update unit preference based on the units used
      unitPreference: {
        weightUnit: args.biometrics.bodyWeightUnit,
        distanceUnit: args.biometrics.heightUnit === "inches" ? "inches" : "cm",
      },
    });

    return { bodyWeightKg, heightCm, bmi };
  },
});

// Update training goals (for settings page)
export const updateTrainingGoals = mutation({
  args: {
    userId: v.id("users"),
    trainingGoals: v.object({
      primaryGoal: v.union(v.literal("strength"), v.literal("muscle"), v.literal("weight_loss"), v.literal("general")),
      experienceLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
      timePerWorkout: v.union(v.literal(30), v.literal(45), v.literal(60), v.literal(90)),
      workoutsPerWeek: v.union(v.literal(2), v.literal(3), v.literal(4), v.literal(5), v.literal(6)),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      trainingGoals: args.trainingGoals,
    });

    return args.trainingGoals;
  },
});
