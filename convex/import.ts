import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { EXERCISES } from "./exercises";

// Import workouts from Stronglifts CSV
export const importWorkouts = mutation({
  args: {
    userId: v.id("users"),
    workouts: v.array(
      v.object({
        startedAt: v.number(),
        completedAt: v.number(),
        status: v.literal("completed"),
        plan: v.array(
          v.object({
            exerciseId: v.string(),
            sets: v.number(),
            reps: v.number(),
            weight: v.number(),
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
            completedReps: v.number(),
            completedAt: v.number(),
            failed: v.boolean(),
          })
        ),
        currentSetIndex: v.number(),
      })
    ),
    currentWeights: v.record(
      v.string(), // exerciseId
      v.object({
        weight: v.number(),
        date: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Insert all workouts
    const insertedIds: string[] = [];
    
    for (const workout of args.workouts) {
      const id = await ctx.db.insert("workouts", {
        userId: args.userId,
        ...workout,
      });
      insertedIds.push(id);
    }

    // Update user profile with current weights
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (profile) {
      const updatedExercises = { ...profile.exercises };

      for (const [exerciseId, data] of Object.entries(args.currentWeights)) {
        // Check if exercise exists in our definitions
        const exerciseDef = EXERCISES.find((e) => e.id === exerciseId);
        
        if (!updatedExercises[exerciseId]) {
          // Create new exercise settings
          updatedExercises[exerciseId] = {
            currentWeight: data.weight,
            weightUnit: "kg",
            successCount: 0,
            failureCount: 0,
            incrementKg: exerciseDef?.defaultProgression.incrementKg || 2.5,
            deloadAfterFailures: exerciseDef?.defaultProgression.deloadAfterFailures || 3,
            deloadPercent: exerciseDef?.defaultProgression.deloadPercent || 0.1,
          };
        } else {
          // Update existing
          updatedExercises[exerciseId].currentWeight = data.weight;
        }
      }

      await ctx.db.patch(profile._id, {
        exercises: updatedExercises,
      });
    }

    return {
      importedWorkouts: insertedIds.length,
      updatedWeights: Object.keys(args.currentWeights).length,
    };
  },
});

// Delete all imported data (for re-import)
export const clearImportedData = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let deletedCount = 0;
    for (const workout of workouts) {
      if (workout.status === "completed" || workout.status === "cancelled") {
        await ctx.db.delete(workout._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
