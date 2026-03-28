import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { generateAllSets, type WorkoutSet } from "./warmup";
import {
  applyProgressionFromWorkout,
  type ProfileExerciseSettings,
} from "./progression";

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
    // Use the by_user_started index to get workouts sorted by startedAt
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    // Filter out active workouts and sort by startedAt to ensure correct order
    const completedWorkouts = workouts.filter(w => w.status !== "active");
    
    // Additional client-side sort to ensure proper date ordering
    // (handles edge cases where startedAt might differ from index order)
    return completedWorkouts.sort((a, b) => b.startedAt - a.startedAt);
  },
});

// Get exercise history - all completed sets for a specific exercise
export const getExerciseHistory = query({
  args: { 
    userId: v.id("users"),
    exerciseId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_started", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 100);

    // Extract all completed sets for this exercise
    const history: Array<{
      workoutId: string;
      workoutType: string;
      startedAt: number;
      completedAt: number | undefined;
      setNumber: number;
      targetReps: number;
      targetWeight: number;
      completedReps: number | undefined;
      completedTimeSeconds: number | undefined;
      failed: boolean;
    }> = [];

    for (const workout of workouts) {
      if (workout.status !== "completed") continue;
      
      const exerciseSets = workout.sets.filter(
        (s: any) => s.exerciseId === args.exerciseId && s.type === "work"
      );
      
      for (const set of exerciseSets) {
        history.push({
          workoutId: workout._id,
          workoutType: workout.workoutType || "A",
          startedAt: workout.startedAt,
          completedAt: workout.completedAt,
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          completedReps: set.completedReps,
          completedTimeSeconds: set.completedTimeSeconds,
          failed: set.failed,
        });
      }
    }

    // Sort by date (oldest first for progress view)
    return history.sort((a, b) => a.startedAt - b.startedAt);
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
      const updatedExercises = applyProgressionFromWorkout(
        profile.exercises as Record<string, ProfileExerciseSettings>,
        workout.plan,
        workout.sets as WorkoutSet[]
      );

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
    // First, save the workout
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.userId,
      startedAt: args.completedAt - 3600000, // Estimate start time (1 hour before completion)
      completedAt: args.completedAt,
      status: "completed",
      workoutType: args.workoutType, // Store the workout type (A, B, or program name)
      plan: args.plan,
      sets: args.sets,
      currentSetIndex: args.sets.length,
    });

    // Then, update exercise progression in user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (profile) {
      const updatedExercises = applyProgressionFromWorkout(
        profile.exercises as Record<string, ProfileExerciseSettings>,
        args.plan,
        args.sets as WorkoutSet[]
      );

      await ctx.db.patch(profile._id, { exercises: updatedExercises });
    }

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
