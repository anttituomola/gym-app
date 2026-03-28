import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all programs for a user
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainingPrograms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get a single program
export const get = query({
  args: { programId: v.id("trainingPrograms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.programId);
  },
});

// Get active program for a user
export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainingPrograms")
      .withIndex("by_user_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .first();
  },
});

// Create a new program
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
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
            timeSeconds: v.optional(v.number()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const programId = await ctx.db.insert("trainingPrograms", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      isActive: false,
      workouts: args.workouts,
    });
    return programId;
  },
});

// Update a program
export const update = mutation({
  args: {
    programId: v.id("trainingPrograms"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    workouts: v.optional(
      v.array(
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
              timeSeconds: v.optional(v.number()),
            })
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");
    if (program.userId !== args.userId) throw new Error("Unauthorized");

    const updateData: Partial<typeof program> = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.workouts !== undefined) updateData.workouts = args.workouts;

    await ctx.db.patch(args.programId, updateData);
    return args.programId;
  },
});

// Delete a program
export const remove = mutation({
  args: {
    programId: v.id("trainingPrograms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");
    if (program.userId !== args.userId) throw new Error("Unauthorized");

    // If this was the active program, clear it from profile
    if (program.isActive) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      if (profile && profile.activeProgramId === args.programId) {
        await ctx.db.patch(profile._id, { activeProgramId: undefined });
      }
    }

    await ctx.db.delete(args.programId);
    return args.programId;
  },
});

// Set active program
export const setActive = mutation({
  args: {
    programId: v.id("trainingPrograms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("Program not found");
    if (program.userId !== args.userId) throw new Error("Unauthorized");

    // Deactivate all other programs for this user
    const existingPrograms = await ctx.db
      .query("trainingPrograms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const p of existingPrograms) {
      if (p.isActive) {
        await ctx.db.patch(p._id, { isActive: false });
      }
    }

    // Activate the selected program
    await ctx.db.patch(args.programId, { isActive: true });

    // Update user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { activeProgramId: args.programId });
    }

    return args.programId;
  },
});

// Deactivate all programs (clear active)
export const deactivateAll = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Deactivate all programs for this user
    const existingPrograms = await ctx.db
      .query("trainingPrograms")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const p of existingPrograms) {
      if (p.isActive) {
        await ctx.db.patch(p._id, { isActive: false });
      }
    }

    // Update user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { activeProgramId: undefined });
    }

    return true;
  },
});
