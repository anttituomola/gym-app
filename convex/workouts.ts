import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { generateAllSets, type WorkoutSet } from "./warmup";

// Get active workout for user
export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .first();
  },
});

// Get workout history
export const getHistory = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    return workouts.filter(w => w.status !== "active");
  },
});

// Start a new workout
export const start = mutation({
  args: {
    userId: v.id("users"),
    plan: v.array(
      v.object({
        exerciseId: v.string(),
        sets: v.number(),
        reps: v.number(),
        weight: v.number(),
        timeSeconds: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check for existing active workout
    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active")
      )
      .first();

    if (existing) {
      throw new Error("Already have an active workout");
    }

    // Generate all sets including warmup
    let allSets: WorkoutSet[] = [];
    for (const exercise of args.plan) {
      const sets = generateAllSets(
        exercise.exerciseId,
        exercise.sets,
        exercise.reps,
        exercise.weight
      );
      allSets = [...allSets, ...sets];
    }

    const workoutId = await ctx.db.insert("workouts", {
      userId: args.userId,
      startedAt: Date.now(),
      status: "active",
      plan: args.plan,
      sets: allSets,
      currentSetIndex: 0,
    });

    return await ctx.db.get(workoutId);
  },
});

// Complete a set
export const completeSet = mutation({
  args: {
    workoutId: v.id("workouts"),
    setId: v.string(),
    completedReps: v.number(),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.status !== "active") throw new Error("Workout not active");

    const setIndex = workout.sets.findIndex((s: typeof workout.sets[number]) => s.id === args.setId);
    if (setIndex === -1) throw new Error("Set not found");

    const set = workout.sets[setIndex];
    const failed = args.completedReps < set.targetReps;

    const updatedSets = [...workout.sets];
    updatedSets[setIndex] = {
      ...set,
      completedReps: args.completedReps,
      completedAt: Date.now(),
      failed,
    };

    // Move to next set
    const nextSetIndex = setIndex + 1;

    await ctx.db.patch(args.workoutId, {
      sets: updatedSets,
      currentSetIndex: nextSetIndex,
    });

    return { set: updatedSets[setIndex], isLastSet: nextSetIndex >= workout.sets.length };
  },
});

// Complete workout
export const complete = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");

    // Update user profile with new weights based on success/failure
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", workout.userId))
      .first();

    if (profile) {
      const updatedExercises = { ...profile.exercises };

      // Process each exercise
      for (const planItem of workout.plan) {
        const exerciseSets = workout.sets.filter(
          s => s.exerciseId === planItem.exerciseId && s.type === "work"
        );
        
        const allCompleted = exerciseSets.every(
          s => s.completedReps && s.completedReps >= s.targetReps
        );
        
        const anyFailed = exerciseSets.some(s => s.failed);

        const settings = updatedExercises[planItem.exerciseId];
        if (settings) {
          if (allCompleted) {
            settings.successCount++;
            settings.failureCount = 0;

            // Check for progression
            if (settings.successCount >= 1) { // Progress after each success for simplicity
              settings.currentWeight += settings.incrementKg;
              settings.successCount = 0;
            }
          } else if (anyFailed) {
            settings.failureCount++;
            settings.successCount = 0;

            // Check for deload
            if (settings.failureCount >= settings.deloadAfterFailures) {
              settings.currentWeight *= (1 - settings.deloadPercent);
              settings.currentWeight = Math.round(settings.currentWeight / 1.25) * 1.25; // Round to nearest 1.25kg
              settings.failureCount = 0;
            }
          }

          updatedExercises[planItem.exerciseId] = settings;
        }
      }

      await ctx.db.patch(profile._id, { exercises: updatedExercises });
    }

    await ctx.db.patch(args.workoutId, {
      status: "completed",
      completedAt: Date.now(),
    });

    return await ctx.db.get(args.workoutId);
  },
});

// Cancel workout
export const cancel = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workoutId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return await ctx.db.get(args.workoutId);
  },
});

// Save a completed workout (from localStorage/local state)
export const saveCompleted = mutation({
  args: {
    userId: v.id("users"),
    workoutType: v.string(),
    plan: v.array(
      v.object({
        exerciseId: v.string(),
        sets: v.number(),
        reps: v.number(),
        weight: v.number(),
        timeSeconds: v.optional(v.number()),
      })
    ),
    sets: v.array(
      v.object({
        id: v.string(),
        exerciseId: v.string(),
        setNumber: v.number(),
        type: v.union(v.literal("warmup"), v.literal("work")),
        targetReps: v.number(),
        targetWeight: v.number(),
        targetTimeSeconds: v.optional(v.number()),
        completedReps: v.optional(v.number()),
        completedTimeSeconds: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        failed: v.boolean(),
        skipped: v.optional(v.boolean()),
      })
    ),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.userId,
      startedAt: args.completedAt - 3600000, // Estimate start time (1 hour before completion)
      completedAt: args.completedAt,
      status: "completed",
      plan: args.plan,
      sets: args.sets,
      currentSetIndex: args.sets.length,
    });

    return await ctx.db.get(workoutId);
  },
});

// Modify workout with LLM
export const modify = mutation({
  args: {
    workoutId: v.id("workouts"),
    request: v.string(),
    responseSummary: v.string(),
    newPlan: v.array(
      v.object({
        exerciseId: v.string(),
        sets: v.number(),
        reps: v.number(),
        weight: v.number(),
        timeSeconds: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");

    // Store original plan
    const originalPlan = workout.plan;

    // Generate new sets
    let allSets: WorkoutSet[] = [];
    for (const exercise of args.newPlan) {
      const sets = generateAllSets(
        exercise.exerciseId,
        exercise.sets,
        exercise.reps,
        exercise.weight
      );
      allSets = [...allSets, ...sets];
    }

    // Find current exercise to maintain position if possible
    const currentSet = workout.sets[workout.currentSetIndex];
    let newSetIndex = 0;
    
    if (currentSet) {
      const newIndex = allSets.findIndex(
        (s: WorkoutSet) => s.exerciseId === currentSet.exerciseId && s.type === currentSet.type
      );
      if (newIndex !== -1) {
        newSetIndex = newIndex;
      }
    }

    await ctx.db.patch(args.workoutId, {
      plan: args.newPlan,
      sets: allSets,
      currentSetIndex: newSetIndex,
      modifications: {
        at: Date.now(),
        request: args.request,
        responseSummary: args.responseSummary,
        originalPlan,
      },
      status: "modified",
    });

    return await ctx.db.get(args.workoutId);
  },
});
