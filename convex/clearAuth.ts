import { mutation } from "./_generated/server";

export const clearAllAuthData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear all auth-related tables
    const tables = [
      'authAccounts',
      'authSessions', 
      'authTokens',
      'oauthAccounts',
      'users'
    ] as const;
    
    const cleared: Record<string, number> = {};
    
    for (const tableName of tables) {
      try {
        // @ts-ignore - dynamic table access
        const docs = await ctx.db.query(tableName).collect();
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
        }
        cleared[tableName] = docs.length;
      } catch (e) {
        cleared[tableName] = 0;
      }
    }
    
    return { cleared };
  },
});
