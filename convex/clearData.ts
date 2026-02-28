import { mutation } from "./_generated/server";

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear all app tables
    const tables = ['userProfiles', 'trainingPrograms', 'workouts'] as const;
    
    for (const tableName of tables) {
      const docs = await ctx.db.query(tableName).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    
    return { cleared: tables };
  },
});
