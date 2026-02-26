import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Custom auth for SvelteKit
  authTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
  
  authSecrets: defineTable({
    userId: v.id("users"),
    passwordHash: v.string(),
  })
    .index("by_user", ["userId"]),
  
  userProfiles: defineTable({
    userId: v.id("users"),
    exercises: v.record(
      v.string(), // exerciseId
      v.object({
        currentWeight: v.number(),
        weightUnit: v.union(v.literal("kg"), v.literal("lbs")),
        successCount: v.number(),
        failureCount: v.number(),
        incrementKg: v.number(),
        deloadAfterFailures: v.number(),
        deloadPercent: v.number(),
        useBodyweightProgression: v.optional(v.boolean()),
        targetReps: v.optional(v.number()),
        incrementReps: v.optional(v.number()),
      })
    ),
    gymEquipment: v.array(v.string()),
    activeProgramId: v.optional(v.id("trainingPrograms")),
  })
    .index("by_user", ["userId"]),

  trainingPrograms: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    workouts: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        restBetweenSets: v.number(),
        exercises: v.array(
          v.object({
            exerciseId: v.string(),
            sets: v.number(),
            reps: v.number(),
            startingWeight: v.optional(v.number()),
            progression: v.optional(
              v.object({
                incrementKg: v.number(),
                deloadAfterFailures: v.number(),
                deloadPercent: v.number(),
              })
            ),
            restSeconds: v.optional(v.number()),
          })
        ),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  workouts: defineTable({
    userId: v.id("users"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("modified"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
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
        completedReps: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        failed: v.boolean(),
      })
    ),
    currentSetIndex: v.number(),
    modifications: v.optional(
      v.object({
        at: v.number(),
        request: v.string(),
        responseSummary: v.string(),
        originalPlan: v.array(
          v.object({
            exerciseId: v.string(),
            sets: v.number(),
            reps: v.number(),
            weight: v.number(),
          })
        ),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),
});
