import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Generate secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple hash using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Register new user
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize email
    const email = args.email.toLowerCase().trim();
    
    // Check if user already exists with this email
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    
    if (existing) {
      // Check if this user has an OAuth account (Google, etc.)
      const oauthAccount = await ctx.db
        .query("oauthAccounts")
        .withIndex("by_user", (q) => q.eq("userId", existing._id))
        .first();
      
      if (oauthAccount) {
        // User signed up with OAuth before - allow them to add password
        const passwordHash = await hashPassword(args.password);
        
        await ctx.db.insert("authSecrets", {
          userId: existing._id,
          passwordHash,
        });
        
        // Generate auth token
        const token = generateToken();
        const expiresAt = Date.now() + TOKEN_EXPIRY;
        
        await ctx.db.insert("authTokens", {
          userId: existing._id,
          token,
          expiresAt,
        });
        
        return { token, userId: existing._id, linked: true };
      }
      
      throw new Error("An account with this email already exists");
    }
    
    // Hash password
    const passwordHash = await hashPassword(args.password);
    
    // Create user
    const userId = await ctx.db.insert("users", {
      email,
    });
    
    // Store password hash in a separate table
    await ctx.db.insert("authSecrets", {
      userId,
      passwordHash,
    });
    
    // Generate auth token
    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    
    await ctx.db.insert("authTokens", {
      userId,
      token,
      expiresAt,
    });
    
    return { token, userId, linked: false };
  },
});

// Login
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize email
    const email = args.email.toLowerCase().trim();
    
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    
    if (!user) {
      throw new Error("Invalid email or password");
    }
    
    // Find password hash
    const secret = await ctx.db
      .query("authSecrets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    if (!secret) {
      // Check if user has OAuth account
      const oauthAccount = await ctx.db
        .query("oauthAccounts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      
      if (oauthAccount) {
        throw new Error(`This account uses ${oauthAccount.provider} sign-in. Please use that method.`);
      }
      
      throw new Error("Invalid email or password");
    }
    
    // Verify password
    const valid = await verifyPassword(args.password, secret.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }
    
    // Generate auth token
    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    
    // Delete old tokens
    const oldTokens = await ctx.db
      .query("authTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    for (const t of oldTokens) {
      await ctx.db.delete(t._id);
    }
    
    await ctx.db.insert("authTokens", {
      userId: user._id,
      token,
      expiresAt,
    });
    
    return { token, userId: user._id };
  },
});

// OAuth sign-in/sign-up with account linking
export const oauthSignIn = mutation({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // First, check if this OAuth account already exists
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
      const expiresAt = Date.now() + TOKEN_EXPIRY;
      
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
      
      return { token, userId: existingOAuth.userId, isNewUser: false };
    }
    
    // OAuth account doesn't exist - check if email matches existing user
    if (args.email) {
      const email = args.email.toLowerCase().trim();
      const existingUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      
      if (existingUser) {
        // Link OAuth account to existing user
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
        const expiresAt = Date.now() + TOKEN_EXPIRY;
        
        // Delete old tokens
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
        
        return { token, userId: existingUser._id, isNewUser: false, linked: true };
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
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    
    await ctx.db.insert("authTokens", {
      userId,
      token,
      expiresAt,
    });
    
    return { token, userId, isNewUser: true, linked: false };
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

// Get user's connected accounts
export const getUserAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const oauthAccounts = await ctx.db
      .query("oauthAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const hasPassword = await ctx.db
      .query("authSecrets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    return {
      oauth: oauthAccounts.map(a => ({
        provider: a.provider,
        email: a.email,
      })),
      hasPassword: !!hasPassword,
    };
  },
});
