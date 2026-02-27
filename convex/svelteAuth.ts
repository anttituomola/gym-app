import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const TOKEN_EXPIRY_DEFAULT = 365 * 24 * 60 * 60 * 1000; // 1 year (keep users logged in by default)
const TOKEN_EXPIRY_SHORT = 7 * 24 * 60 * 60 * 1000; // 7 days (for shared devices)

// Generate secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// OAuth sign-in/sign-up with account linking
export const oauthSignIn = mutation({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    rememberMe: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if this OAuth account already exists
    const existingOAuth = await ctx.db
      .query("oauthAccounts")
      .withIndex("by_provider_account", (q) => 
        q.eq("provider", args.provider).eq("providerAccountId", args.providerAccountId)
      )
      .first();
    
    if (existingOAuth) {
      // Existing OAuth user - generate token and return
      const user = await ctx.db.get(existingOAuth.userId);
      if (!user) {
        throw new Error("User not found");
      }
      
      const token = generateToken();
      // Use 1 year expiry by default, 7 days if user unchecked "remember me"
      const tokenExpiry = args.rememberMe === false ? TOKEN_EXPIRY_SHORT : TOKEN_EXPIRY_DEFAULT;
      const expiresAt = Date.now() + tokenExpiry;
      
      // Delete old tokens
      const oldTokens = await ctx.db
        .query("authTokens")
        .withIndex("by_user", (q) => q.eq("userId", existingOAuth.userId))
        .collect();
      
      for (const t of oldTokens) {
        await ctx.db.delete(t._id);
      }
      
      await ctx.db.insert("authTokens", {
        userId: existingOAuth.userId,
        token,
        expiresAt,
      });
      
      return { 
        token, 
        userId: existingOAuth.userId, 
        email: user.email,
        isNewUser: false 
      };
    }
    
    // Check if email matches existing user (for account linking)
    if (args.email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email!))
        .first();
      
      if (existingUser) {
        // Link OAuth to existing user
        await ctx.db.insert("oauthAccounts", {
          userId: existingUser._id,
          provider: args.provider,
          providerAccountId: args.providerAccountId,
          email: args.email,
          name: args.name,
          image: args.image,
        });
        
        // Generate token
        const token = generateToken();
        // Use 1 year expiry by default, 7 days if user unchecked "remember me"
        const tokenExpiry = args.rememberMe === false ? TOKEN_EXPIRY_SHORT : TOKEN_EXPIRY_DEFAULT;
        const expiresAt = Date.now() + tokenExpiry;
        
        const oldTokens = await ctx.db
          .query("authTokens")
          .withIndex("by_user", (q) => q.eq("userId", existingUser._id))
          .collect();
        
        for (const t of oldTokens) {
          await ctx.db.delete(t._id);
        }
        
        await ctx.db.insert("authTokens", {
          userId: existingUser._id,
          token,
          expiresAt,
        });
        
        return { 
          token, 
          userId: existingUser._id, 
          email: existingUser.email,
          isNewUser: false 
        };
      }
    }
    
    // Create new user with OAuth
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      image: args.image,
    });
    
    await ctx.db.insert("oauthAccounts", {
      userId,
      provider: args.provider,
      providerAccountId: args.providerAccountId,
      email: args.email,
      name: args.name,
      image: args.image,
    });
    
    // Generate token
    const token = generateToken();
    // Use 1 year expiry by default, 7 days if user unchecked "remember me"
    const tokenExpiry = args.rememberMe === false ? TOKEN_EXPIRY_SHORT : TOKEN_EXPIRY_DEFAULT;
    const expiresAt = Date.now() + tokenExpiry;
    
    await ctx.db.insert("authTokens", {
      userId,
      token,
      expiresAt,
    });
    
    return { 
      token, 
      userId, 
      email: args.email,
      isNewUser: true 
    };
  },
});

// Verify token
export const verifyToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("authTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!tokenDoc || tokenDoc.expiresAt < Date.now()) {
      return null;
    }
    
    const user = await ctx.db.get(tokenDoc.userId);
    return user;
  },
});

// Logout
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("authTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (tokenDoc) {
      await ctx.db.delete(tokenDoc._id);
    }
  },
});

// Get current user from auth context
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
