import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Custom auth tables for SvelteKit OAuth
  authTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
  
  oauthAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  })
    .index("by_provider_account", ["provider", "providerAccountId"])
    .index("by_user", ["userId"]),
  
  // App tables
  userProfiles: defineTable({
    userId: v.id("users"),
    exercises: v.record(
      v.string(),
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
    
    // Onboarding and biometrics
    biometrics: v.optional(v.object({
      sex: v.union(v.literal("male"), v.literal("female")),
      bodyWeightKg: v.number(),
      heightCm: v.number(),
      bmi: v.optional(v.number()),
    })),
    
    trainingGoals: v.optional(v.object({
      primaryGoal: v.union(
        v.literal("strength"),
        v.literal("muscle"),
        v.literal("weight_loss"),
        v.literal("general")
      ),
      experienceLevel: v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      ),
      timePerWorkout: v.union(
        v.literal(30),
        v.literal(45),
        v.literal(60),
        v.literal(90)
      ),
      workoutsPerWeek: v.union(
        v.literal(2),
        v.literal(3),
        v.literal(4),
        v.literal(5),
        v.literal(6)
      ),
    })),
    
    unitPreference: v.optional(v.object({
      weightUnit: v.union(v.literal("kg"), v.literal("lbs")),
      distanceUnit: v.union(v.literal("cm"), v.literal("inches")),
    })),
    
    onboardingCompleted: v.optional(v.boolean()),
    onboardingCompletedAt: v.optional(v.number()),
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
