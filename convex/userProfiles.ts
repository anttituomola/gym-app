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
